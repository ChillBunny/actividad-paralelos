// notification-cloud-run: recibe los mensajes que Pub/Sub le empuja por HTTP, manda el
// correo por SMTP y registra cada paso en Cloud Logging.
package main

import (
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// lo que manda Pub/Sub: el mensaje viene dentro de "message", con los datos en base64
// (Go los decodifica solo al ponerlos en un []byte)
type Envoltura struct {
	Message struct {
		Data      []byte `json:"data"`
		MessageID string `json:"messageId"`
	} `json:"message"`
}

// el correo que publicó el backend
type Correo struct {
	Email   string `json:"email"`
	Subject string `json:"subject"`
	Message string `json:"message"`
}

func main() {
	http.HandleFunc("/", recibir)
	registrar("INFO", "servicio de notificaciones listo")
	http.ListenAndServe(":"+os.Getenv("PORT"), nil)
}

// el logger: escribe una línea en JSON, que Cloud Logging muestra con su nivel
// (INFO o ERROR) y su mensaje
func registrar(nivel string, mensaje string) {
	linea, _ := json.Marshal(map[string]string{"severity": nivel, "message": mensaje})
	fmt.Println(string(linea))
}

// recibe un mensaje de Pub/Sub. Si responde 2xx, Pub/Sub lo da por entregado;
// si responde un error, lo vuelve a mandar más tarde
func recibir(w http.ResponseWriter, r *http.Request) {
	var envoltura Envoltura
	var correo Correo
	if json.NewDecoder(r.Body).Decode(&envoltura) != nil || json.Unmarshal(envoltura.Message.Data, &correo) != nil {
		registrar("ERROR", "llegó un mensaje que no se entiende; se descarta")
		w.WriteHeader(http.StatusNoContent) // no tiene arreglo: se confirma para que no vuelva
		return
	}
	registrar("INFO", "mensaje "+envoltura.Message.MessageID+" recibido de Pub/Sub para "+correo.Email)

	if err := enviar(correo); err != nil {
		registrar("ERROR", "no se pudo enviar el correo a "+correo.Email+": "+err.Error())
		w.WriteHeader(http.StatusInternalServerError) // Pub/Sub lo reintenta
		return
	}

	registrar("INFO", "correo enviado a "+correo.Email+" con asunto: "+correo.Subject)
	w.WriteHeader(http.StatusNoContent)
}

// manda el correo por SMTP con la cuenta que llega en las variables de entorno
func enviar(correo Correo) error {
	servidor := os.Getenv("SMTP_HOST")
	usuario := os.Getenv("SMTP_USER")
	clave := os.Getenv("SMTP_PASSWORD")

	// se quitan los saltos de línea del asunto, para que nadie pueda agregar encabezados
	asunto := strings.NewReplacer("\r", " ", "\n", " ").Replace(correo.Subject)
	texto := "Date: " + time.Now().Format(time.RFC1123Z) + "\r\n" +
		"From: " + usuario + "\r\n" +
		"To: " + correo.Email + "\r\n" +
		"Subject: " + mime.QEncoding.Encode("utf-8", asunto) + "\r\n" +
		"Content-Type: text/plain; charset=utf-8\r\n\r\n" +
		correo.Message

	acceso := smtp.PlainAuth("", usuario, clave, servidor)
	return smtp.SendMail(servidor+":"+os.Getenv("SMTP_PORT"), acceso, usuario, []string{correo.Email}, []byte(texto))
}
