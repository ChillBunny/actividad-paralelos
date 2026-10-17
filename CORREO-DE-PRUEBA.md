# Cuenta de correo de prueba (Ethereal)

Los correos de la app los manda `notification-cloud-run` con esta cuenta de prueba de
[Ethereal](https://ethereal.email). Es una cuenta desechable: los correos **no se entregan**
a la dirección de destino, quedan guardados en la bandeja de Ethereal, sea cual sea el
destino que se escriba en la app.

## Cómo ver los correos

1. Entrar a https://ethereal.email/login
2. Usuario y contraseña de la tabla de abajo.
3. Arriba, **Messages**.

| Dato | Valor |
|---|---|
| Usuario | `norbert.bashirian88@ethereal.email` |
| Contraseña | `R1DXQtxvrMsKNHZNrH` |
| Servidor SMTP | `smtp.ethereal.email`, puerto `587` (STARTTLS) |

Los mismos datos están en `terraform/terraform.tfvars`, que es de donde los toma Terraform
para configurar la Cloud Run de notificaciones.
