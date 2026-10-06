package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// pruebas que no necesitan la base de datos. Se corren con: go test ./...

// la contraseña cifrada no es igual a la original, pero bcrypt puede compararlas
func TestCifrar(t *testing.T) {
	cifrada := cifrar("clave123")
	if cifrada == "clave123" {
		t.Fatal("la contraseña quedó sin cifrar")
	}
	if bcrypt.CompareHashAndPassword([]byte(cifrada), []byte("clave123")) != nil {
		t.Fatal("bcrypt no reconoce la contraseña cifrada")
	}
}

// una ruta protegida deja pasar con un token válido y responde 401 sin token
func TestValidarToken(t *testing.T) {
	os.Setenv("JWT_SECRET", "clave_de_prueba")
	gin.SetMode(gin.TestMode)
	servidor := gin.New()
	servidor.GET("/protegida", validarToken, func(c *gin.Context) {
		c.JSON(200, gin.H{"id": c.GetUint("usuarioID")})
	})

	conToken := httptest.NewRequest("GET", "/protegida", nil)
	conToken.Header.Set("Authorization", "Bearer "+crearToken(7))
	respuesta := httptest.NewRecorder()
	servidor.ServeHTTP(respuesta, conToken)
	if respuesta.Code != http.StatusOK {
		t.Fatalf("con token esperaba 200 y llegó %d", respuesta.Code)
	}

	sinToken := httptest.NewRequest("GET", "/protegida", nil)
	respuesta = httptest.NewRecorder()
	servidor.ServeHTTP(respuesta, sinToken)
	if respuesta.Code != http.StatusUnauthorized {
		t.Fatalf("sin token esperaba 401 y llegó %d", respuesta.Code)
	}
}
