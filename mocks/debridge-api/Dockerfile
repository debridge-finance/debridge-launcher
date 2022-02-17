FROM golang:alpine as builder
RUN mkdir /build 
ADD . /build/
WORKDIR /build 

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-extldflags "-static"' -o main ./main.go

FROM alpine
COPY --from=builder /build/main /app/

WORKDIR /app
EXPOSE 5015
CMD ["./main"]
