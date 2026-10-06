# etapa 1: una imagen con Go compila la API
FROM golang:1.26 AS compilar
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o api .

# etapa 2: la imagen final solo lleva el programa ya compilado, así pesa unos 20 MB y no 900
FROM alpine:3.22
WORKDIR /app
COPY --from=compilar /app/api .
EXPOSE 8080
CMD ["./api"]
