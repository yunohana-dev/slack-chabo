package main

import (
	"github.com/sashabaranov/go-openai"
)

type Request struct {
	Callback     string                         `json:"callback" validate:"required"`
	ChannelID    string                         `json:"channel_id" validate:"required"`
	UserID       string                         `json:"user_id" validate:"required"`
	MessageTS    string                         `json:"message_ts" validate:"required"`
	OpenAIAPIKey string                         `json:"openai_api_key" validate:"required"`
	Prompt       []openai.ChatCompletionMessage `json:"prompt" validate:"required"`
}

type Response struct {
	ChannelID    string                       `json:"channel_id"`
	UserID       string                       `json:"user_id"`
	MessageTS    string                       `json:"message_ts"`
	UserPrompt   openai.ChatCompletionMessage `json:"user_prompt"`
	AnswerPrompt openai.ChatCompletionMessage `json:"answer_prompt"`
	IsFinished   bool                         `json:"is_finished,string"`
}
