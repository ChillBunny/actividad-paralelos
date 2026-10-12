package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// un mensaje que no se entiende se confirma (204) para que Pub/Sub no lo mande otra vez
func TestMensajeMalFormado(t *testing.T) {
	pedido := httptest.NewRequest("POST", "/", strings.NewReader("esto no es JSON"))
	respuesta := httptest.NewRecorder()
	recibir(respuesta, pedido)
	if respuesta.Code != http.StatusNoContent {
		t.Fatalf("esperaba 204 y llegó %d", respuesta.Code)
	}
}

// si el correo no se puede enviar (aquí no hay servidor SMTP), responde 500 para que
// Pub/Sub lo reintente. "eyJ..." es el correo en base64, como lo manda Pub/Sub
func TestCorreoQueFallaSeReintenta(t *testing.T) {
	cuerpo := `{"message":{"messageId":"1","data":"eyJlbWFpbCI6ImFAYi5jb20iLCJzdWJqZWN0IjoiaG9sYSIsIm1lc3NhZ2UiOiJwcnVlYmEifQ=="}}`
	pedido := httptest.NewRequest("POST", "/", strings.NewReader(cuerpo))
	respuesta := httptest.NewRecorder()
	recibir(respuesta, pedido)
	if respuesta.Code != http.StatusInternalServerError {
		t.Fatalf("esperaba 500 y llegó %d", respuesta.Code)
	}
}
