# etapa 1: una imagen con Go compila el servicio de notificaciones
FROM golang:1.26 AS compilar
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o notifications .

# etapa 2: la imagen final solo lleva el programa ya compilado
FROM alpine:3.22
WORKDIR /app
COPY --from=compilar /app/notifications .
EXPOSE 8080
CMD ["./notifications"]
