// API de la actividad 2: usuarios con login JWT, CRUD y subida de archivos,
// guardados en PostgreSQL. La consume la app móvil hecha en React Native.
package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// ---------- Las tablas y los datos que llegan ----------

// la conexión a la base, la usan todas las funciones
var base *gorm.DB

// un usuario de la tabla users. GORM crea la tabla sola a partir de esta estructura
type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	LastName  string    `json:"lastName"`
	Email     string    `json:"email" gorm:"unique"`
	Password  string    `json:"-"` // el "-" hace que nunca se mande en las respuestas
	Photo     string    `json:"photo"`
	CreatedAt time.Time `json:"createdAt"`
}

// un archivo subido, de la tabla files
type File struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Filename  string    `json:"filename"`
	URL       string    `json:"url"`
	UserID    uint      `json:"userId"`
	CreatedAt time.Time `json:"createdAt"`
}

// lo que llega para crear un usuario: todo obligatorio
type DatosUsuario struct {
	Name     string `json:"name" binding:"required"`
	LastName string `json:"lastName" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// lo que llega para editar un usuario: solo se cambia lo que venga.
// sin etiquetas json porque Go lee el JSON sin importar mayúsculas ("lastName" va a LastName)
type DatosEdicion struct {
	Name, LastName, Email, Password, Photo string
}

// lo que llega para entrar
type DatosLogin struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// un aviso del dashboard
type Notificacion struct {
	Message string    `json:"message"`
	Date    time.Time `json:"date"`
}

// ---------- Las rutas ----------

func main() {
	godotenv.Load() // lee el archivo .env, para no escribir claves en el código
	conectar()
	os.MkdirAll("uploads", 0755) // la carpeta donde se guardan los archivos subidos

	servidor := gin.Default()

	// los archivos subidos se ven en /uploads/nombre. En Cloud Run esa carpeta es un bucket
	// de Cloud Storage montado, así los archivos no se pierden cuando el servicio se apaga
	servidor.Static("/uploads", "./uploads")

	// sin token: comprobar que la API responde, registrarse y entrar (también como super usuario)
	servidor.GET("/", func(c *gin.Context) { c.JSON(200, gin.H{"mensaje": "API funcionando"}) })
	servidor.POST("/register", registrar)
	servidor.POST("/login", login)
	servidor.POST("/login/super", entrarComoSuperUsuario)

	// con token: todas estas pasan primero por validarToken
	protegido := servidor.Group("/", validarToken)
	protegido.GET("/users", listarUsuarios)
	protegido.GET("/users/:id", verUsuario)
	protegido.POST("/users", registrar)
	protegido.PUT("/users/:id", editarUsuario)
	protegido.DELETE("/users/:id", borrarUsuario)
	protegido.GET("/files", listarArchivos)
	protegido.POST("/upload", subirArchivo)
	protegido.DELETE("/upload/:id", borrarArchivo)
	protegido.GET("/profile", verPerfil)
	protegido.GET("/stats", verEstadisticas)
	protegido.GET("/notifications", verNotificaciones)

	// escucha en todas las direcciones de la computadora, para que el teléfono pueda entrar
	servidor.Run(":8080")
}

// se conecta a PostgreSQL y crea las tablas si no existen. En la nube los datos de conexión
// llegan completos en DATABASE_URL (desde Secret Manager); en la computadora se arman con
// las variables del archivo .env
func conectar() {
	datos := os.Getenv("DATABASE_URL")
	if datos == "" {
		datos = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("POSTGRES_USER"),
			os.Getenv("POSTGRES_PASSWORD"), os.Getenv("POSTGRES_DB"))
	}

	var err error
	base, err = gorm.Open(postgres.Open(datos), &gorm.Config{})
	if err != nil {
		log.Fatal("no se pudo conectar a la base: ", err)
	}
	base.AutoMigrate(&User{}, &File{})
}

// ---------- Registro, login y JWT ----------

// las contraseñas se guardan cifradas con bcrypt, nunca en texto plano
func cifrar(clave string) string {
	cifrada, _ := bcrypt.GenerateFromPassword([]byte(clave), bcrypt.DefaultCost)
	return string(cifrada)
}

// el token lleva el id del usuario y vence en 24 horas, firmado con la clave del .env
func crearToken(id uint) string {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":  id,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
	})
	texto, _ := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	return texto
}

// POST /register (y POST /users): crea un usuario nuevo
func registrar(c *gin.Context) {
	var datos DatosUsuario
	if c.ShouldBindJSON(&datos) != nil {
		c.JSON(400, gin.H{"error": "faltan datos: name, lastName, email y password (mínimo 6)"})
		return
	}

	usuario := User{Name: datos.Name, LastName: datos.LastName, Email: datos.Email, Password: cifrar(datos.Password)}
	if base.Create(&usuario).Error != nil {
		c.JSON(409, gin.H{"error": "ese email ya está registrado"})
		return
	}
	c.JSON(201, usuario)
}

// POST /login: si el email y la contraseña son correctos, devuelve un JWT
func login(c *gin.Context) {
	var datos DatosLogin
	if c.ShouldBindJSON(&datos) != nil {
		c.JSON(400, gin.H{"error": "faltan el email o la contraseña"})
		return
	}

	// busca el usuario por email y compara la contraseña con la cifrada
	var usuario User
	if base.Where("email = ?", datos.Email).First(&usuario).Error != nil ||
		bcrypt.CompareHashAndPassword([]byte(usuario.Password), []byte(datos.Password)) != nil {
		c.JSON(401, gin.H{"error": "email o contraseña incorrectos"})
		return
	}
	c.JSON(200, gin.H{"token": crearToken(usuario.ID), "user": usuario})
}

// POST /login/super: entra sin contraseña como el super usuario, Iván Mendoza.
// Es para el prototipo, por si no se recuerda ningún usuario. Lo busca por email y,
// si no está (porque se borró), lo crea con estos datos
func entrarComoSuperUsuario(c *gin.Context) {
	usuario := User{Name: "Iván", LastName: "Mendoza", Email: "ivan@test.com"}
	base.Where("email = ?", usuario.Email).FirstOrCreate(&usuario)
	c.JSON(200, gin.H{"token": crearToken(usuario.ID), "user": usuario})
}

// revisa el JWT antes de dejar pasar a las rutas protegidas.
// se manda en el encabezado: Authorization: Bearer TOKEN
func validarToken(c *gin.Context) {
	texto := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")

	token, err := jwt.Parse(texto, func(t *jwt.Token) (any, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	}, jwt.WithValidMethods([]string{"HS256"}))

	if err != nil || !token.Valid {
		c.AbortWithStatusJSON(401, gin.H{"error": "falta el token, o es inválido o está vencido"})
		return
	}

	// guarda el id del usuario que hizo la petición, para usarlo después
	datos := token.Claims.(jwt.MapClaims)
	c.Set("usuarioID", uint(datos["id"].(float64)))
	c.Next()
}

// ---------- CRUD de usuarios ----------

// GET /users: todos los usuarios
func listarUsuarios(c *gin.Context) {
	var usuarios []User
	base.Find(&usuarios)
	c.JSON(200, usuarios)
}

// GET /users/:id: un usuario
func verUsuario(c *gin.Context) {
	var usuario User
	if base.First(&usuario, c.Param("id")).Error != nil {
		c.JSON(404, gin.H{"error": "usuario no encontrado"})
		return
	}
	c.JSON(200, usuario)
}

// PUT /users/:id: cambia los datos que lleguen, incluida la foto
func editarUsuario(c *gin.Context) {
	var usuario User
	if base.First(&usuario, c.Param("id")).Error != nil {
		c.JSON(404, gin.H{"error": "usuario no encontrado"})
		return
	}

	var datos DatosEdicion
	c.ShouldBindJSON(&datos)
	cambios := User{Name: datos.Name, LastName: datos.LastName, Email: datos.Email, Photo: datos.Photo}
	if datos.Password != "" {
		cambios.Password = cifrar(datos.Password)
	}

	// Updates con una estructura solo cambia los campos que no están vacíos
	if base.Model(&usuario).Updates(cambios).Error != nil {
		c.JSON(409, gin.H{"error": "ese email ya está registrado"})
		return
	}
	c.JSON(200, usuario)
}

// DELETE /users/:id: borra un usuario
func borrarUsuario(c *gin.Context) {
	if base.Delete(&User{}, c.Param("id")).RowsAffected == 0 {
		c.JSON(404, gin.H{"error": "usuario no encontrado"})
		return
	}
	c.JSON(200, gin.H{"mensaje": "usuario eliminado"})
}

// ---------- Archivos ----------

// las extensiones que se aceptan
var permitidas = map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".pdf": true}

// GET /files: los archivos que subió el usuario del token, para la galería de la app
func listarArchivos(c *gin.Context) {
	var archivos []File
	base.Where("user_id = ?", c.GetUint("usuarioID")).Order("id desc").Find(&archivos)
	c.JSON(200, archivos)
}

// POST /upload: recibe un archivo en el campo "archivo", lo valida, lo guarda en la carpeta
// uploads y lo registra en la tabla files
func subirArchivo(c *gin.Context) {
	archivo, err := c.FormFile("archivo")
	if err != nil {
		c.JSON(400, gin.H{"error": "falta el archivo"})
		return
	}

	// validar: tipo y tamaño
	extension := strings.ToLower(filepath.Ext(archivo.Filename))
	if !permitidas[extension] {
		c.JSON(400, gin.H{"error": "solo se aceptan jpg, png o pdf"})
		return
	}
	if archivo.Size > 5*1024*1024 {
		c.JSON(400, gin.H{"error": "el archivo pasa de 5 MB"})
		return
	}

	// primero se registra en la tabla, para usar su id en el nombre: archivo_15.png
	registro := File{UserID: c.GetUint("usuarioID")}
	base.Create(&registro)
	nombre := fmt.Sprintf("archivo_%d%s", registro.ID, extension)

	if c.SaveUploadedFile(archivo, "uploads/"+nombre) != nil {
		base.Delete(&registro)
		c.JSON(500, gin.H{"error": "no se pudo guardar el archivo"})
		return
	}

	// con el archivo ya guardado, se completa el registro con su nombre y su dirección
	registro.Filename = nombre
	registro.URL = "/uploads/" + nombre
	base.Save(&registro)
	c.JSON(201, registro)
}

// DELETE /upload/:id: borra el archivo de la carpeta y su registro de la tabla
func borrarArchivo(c *gin.Context) {
	var registro File
	if base.First(&registro, c.Param("id")).Error != nil {
		c.JSON(404, gin.H{"error": "archivo no encontrado"})
		return
	}
	os.Remove("uploads/" + registro.Filename)
	base.Delete(&registro)
	c.JSON(200, gin.H{"mensaje": "archivo eliminado"})
}

// ---------- Dashboard ----------

// GET /profile: los datos del usuario dueño del token
func verPerfil(c *gin.Context) {
	var usuario User
	base.First(&usuario, c.GetUint("usuarioID"))
	c.JSON(200, usuario)
}

// GET /stats: cuántos usuarios hay y cuántos archivos se subieron entre todos
func verEstadisticas(c *gin.Context) {
	var usuarios, archivos int64
	base.Model(&User{}).Count(&usuarios)
	base.Model(&File{}).Count(&archivos)
	c.JSON(200, gin.H{"users": usuarios, "files": archivos})
}

// GET /notifications: los últimos usuarios registrados y archivos subidos, del más nuevo
// al más viejo
func verNotificaciones(c *gin.Context) {
	var usuarios []User
	var archivos []File
	base.Order("created_at desc").Limit(10).Find(&usuarios)
	base.Order("created_at desc").Limit(10).Find(&archivos)

	avisos := []Notificacion{}
	for _, u := range usuarios {
		avisos = append(avisos, Notificacion{"Se registró " + u.Name + " " + u.LastName, u.CreatedAt})
	}
	for _, a := range archivos {
		avisos = append(avisos, Notificacion{"Se subió el archivo " + a.Filename, a.CreatedAt})
	}
	sort.Slice(avisos, func(i, j int) bool { return avisos[i].Date.After(avisos[j].Date) })
	c.JSON(200, avisos)
}
