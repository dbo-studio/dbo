package syslog

import (
	"github.com/dbo-studio/dbo/pkg/logger"
	"log"
)

type syslog struct{}

func New() logger.Logger {
	return &syslog{}
}

func (s *syslog) Error(msg any) {
	log.Println(msg)
}

func (s *syslog) Fatal(msg any) {
	log.Println(msg)
}

func (s *syslog) Warn(msg any) {
	log.Println(msg)
}

func (s *syslog) Info(msg any) {
	log.Println(msg)
}
