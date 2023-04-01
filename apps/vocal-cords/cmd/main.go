package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/sashabaranov/go-openai"
	"io"
	"net/http"
	"regexp"
	"time"
)

func handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	param, err := convBodyToRequest(request.Body)
	if err != nil {
		return events.APIGatewayProxyResponse{
			Body:       err.Error(),
			StatusCode: http.StatusBadRequest,
		}, err
	}
	// fmt.Printf("(%%#v) %#v\n", param)

	c := openai.NewClient(param.OpenAIAPIKey)
	ctx := context.Background()

	req := openai.ChatCompletionRequest{
		Model: openai.GPT3Dot5Turbo,
		// MaxTokens: 20,
		Messages: param.Prompt,
		Stream:   true,
	}
	stream, err := c.CreateChatCompletionStream(ctx, req)
	if err != nil {
		fmt.Printf("CompletionStream error: %v\n", err)
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusInternalServerError,
			Body:       err.Error(),
		}, err
	}
	defer stream.Close()

	sep := regexp.MustCompile("\\n")
	var answer = ""
	for {
		recv, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			fmt.Println("\nStream finished")
			break
		}
		if err != nil {
			fmt.Printf("\nStream error: %v\n", err)
			execCallback(*param, err.Error(), false)
			return events.APIGatewayProxyResponse{
				StatusCode: http.StatusBadRequest,
				Body:       err.Error(),
			}, nil
		}
		cont := recv.Choices[0].Delta.Content
		fmt.Printf(cont)
		answer += cont

		// sep で指定する任意の文字が現れたときcallbackへ途中経過を送信
		if sep.MatchString(cont) {
			execCallback(*param, answer, false)
		}
	}
	for i := 0; i < 3; {
		i++
		time.Sleep(time.Second)
		err := execCallback(*param, answer, true)
		if err == nil {
			break
		}
		fmt.Printf("retry callback request(%v/%v)", i, 3)
	}

	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Body:       answer,
	}, nil
}

func convBodyToRequest(body string) (*Request, error) {
	var req Request
	err := json.Unmarshal([]byte(body), &req)
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func execCallback(param Request, answer string, isFinished bool) error {
	body, _ := json.Marshal(&Response{
		ChannelID: param.ChannelID,
		UserID:    param.UserID,
		MessageTS: param.MessageTS,
		UserPrompt: openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleUser,
			Content: param.Prompt[len(param.Prompt)-1].Content,
		},
		AnswerPrompt: openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleAssistant,
			Content: answer,
		},
		IsFinished: isFinished,
	})
	res, err := http.Post(param.Callback, "application/json", bytes.NewBuffer(body))
	if err != nil {
		fmt.Printf("\nCallback error: %v\n", err)
		return err
	}
	if res.StatusCode > 299 {
		err := fmt.Errorf("non 2XX Response found: %v", res.Status)
		fmt.Printf("\nCallback error: %v\n", err)
		return err
	}
	defer res.Body.Close()
	return nil
}

func main() {
	lambda.Start(handler)
}
