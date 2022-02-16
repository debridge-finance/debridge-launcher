package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type ReqParams struct {
	Message string `json:"message"`
}

type ReqResponse struct {
	Message string `json:"message"`
}

func main() {

	http.HandleFunc("/Validator/notifyError", notifyError)

	fmt.Println("Server started at the :5015")
	fmt.Println(http.ListenAndServe(":5015", nil))

}

func notifyError(w http.ResponseWriter, r *http.Request) {
	var (
		params = &ReqParams{}
	)

	err := json.NewDecoder(r.Body).Decode(params)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	fmt.Printf("params: %+v\n", params)
	Write(
		w, r, http.StatusCreated,
		&ReqResponse{
			Message: params.Message,
		},
	)
}

func Write(w http.ResponseWriter, r *http.Request, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if payload != nil {
		err := Encode(r, w, payload)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}

func Encode(req *http.Request, w io.Writer, v interface{}) error { return json.NewEncoder(w).Encode(v) }

func Decode(req *http.Request, v interface{}, r io.Reader) error { return json.NewDecoder(r).Decode(v) }
