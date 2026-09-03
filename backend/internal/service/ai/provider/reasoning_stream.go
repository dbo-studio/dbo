package serviceAiProvider

import (
	"strings"

	"github.com/tidwall/gjson"
)

const (
	thinkTagOpen  = "<think>"
	thinkTagClose = "</think>"
)

func reasoningFromDeltaJSON(rawJSON string) string {
	for _, path := range []string{"reasoning_content", "reasoning", "thinking"} {
		if value := gjson.Get(rawJSON, path).String(); value != "" {
			return value
		}
	}

	return ""
}

type thinkTagParser struct {
	inThinking bool
	partial    string
}

func newThinkTagParser() *thinkTagParser {
	return &thinkTagParser{}
}

func suffixPrefixOverlap(text, prefix string) int {
	limit := min(len(text), len(prefix))
	for size := limit; size > 0; size-- {
		if strings.HasPrefix(prefix, text[len(text)-size:]) {
			return size
		}
	}

	return 0
}

func (p *thinkTagParser) Process(delta string) (thinking, content string) {
	text := p.partial + delta
	p.partial = ""

	for text != "" {
		if p.inThinking {
			closeIdx := strings.Index(text, thinkTagClose)
			if closeIdx == -1 {
				holdBack := suffixPrefixOverlap(text, thinkTagClose)
				if holdBack > 0 {
					thinking += text[:len(text)-holdBack]
					p.partial = text[len(text)-holdBack:]
				} else {
					thinking += text
				}

				return thinking, content
			}

			thinking += text[:closeIdx]
			text = text[closeIdx+len(thinkTagClose):]
			p.inThinking = false

			continue
		}

		openIdx := strings.Index(text, thinkTagOpen)
		if openIdx == -1 {
			holdBack := suffixPrefixOverlap(text, thinkTagOpen)
			if holdBack > 0 {
				content += text[:len(text)-holdBack]
				p.partial = text[len(text)-holdBack:]
			} else {
				content += text
			}

			return thinking, content
		}

		content += text[:openIdx]
		text = text[openIdx+len(thinkTagOpen):]
		p.inThinking = true
	}

	return thinking, content
}

type streamReasoningState struct {
	thinkingStarted bool
	thinkingStart   func() error
	thinkingDelta   func(string) error
	thinkingEnd     func() error
	thinkParser     *thinkTagParser
}

func newStreamReasoningState(
	thinkingStart func() error,
	thinkingDelta func(string) error,
	thinkingEnd func() error,
) *streamReasoningState {
	return &streamReasoningState{
		thinkingStart: thinkingStart,
		thinkingDelta: thinkingDelta,
		thinkingEnd:   thinkingEnd,
		thinkParser:   newThinkTagParser(),
	}
}

func (s *streamReasoningState) emitThinking(reasoning string) error {
	if reasoning == "" {
		return nil
	}

	if !s.thinkingStarted {
		s.thinkingStarted = true
		if err := s.thinkingStart(); err != nil {
			return err
		}
	}

	return s.thinkingDelta(reasoning)
}

func (s *streamReasoningState) endThinkingIfNeeded() error {
	if !s.thinkingStarted {
		return nil
	}

	if err := s.thinkingEnd(); err != nil {
		return err
	}

	s.thinkingStarted = false

	return nil
}

func (s *streamReasoningState) processReasoningField(rawJSON string) error {
	return s.emitThinking(reasoningFromDeltaJSON(rawJSON))
}

func (s *streamReasoningState) processContentField(content string) (string, error) {
	thinking, answer := s.thinkParser.Process(content)
	if err := s.emitThinking(thinking); err != nil {
		return "", err
	}

	if answer == "" {
		return "", nil
	}

	if err := s.endThinkingIfNeeded(); err != nil {
		return "", err
	}

	return answer, nil
}

func (s *streamReasoningState) finish() error {
	if s.thinkParser.inThinking && s.thinkParser.partial != "" {
		if err := s.emitThinking(s.thinkParser.partial); err != nil {
			return err
		}

		s.thinkParser.partial = ""
	}

	return s.endThinkingIfNeeded()
}
