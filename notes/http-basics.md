# HTTP basics

HTTP is a stateless request-response protocol. A client sends a request containing a method, a path and headers, and the server replies with a status code, headers and an optional body.

Status codes are grouped by their first digit: 2xx means success, 3xx means redirection, 4xx means the client made an error, and 5xx means the server failed.

GET requests should be safe and idempotent: they fetch data without changing server state. POST requests create resources or trigger actions and are not idempotent.
