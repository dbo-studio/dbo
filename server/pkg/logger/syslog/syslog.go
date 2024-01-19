package syslog

import (
	"log"

	"github.com/khodemobin/dbo/pkg/logger"
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
