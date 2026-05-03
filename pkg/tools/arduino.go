package tools

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// ArduinoTool provides sketch compilation and upload via arduino-cli.
type ArduinoTool struct {
	fqbn     string // fully qualified board name, e.g. "arduino:zephyr:unoq"
	port     string // upload target, e.g. "192.168.1.42" or "/dev/ttyACM0"
	protocol string // upload protocol, e.g. "network" or "serial"
	timeout  time.Duration
}

// NewArduinoTool creates an ArduinoTool with board defaults.
func NewArduinoTool(fqbn, port, protocol string) *ArduinoTool {
	if fqbn == "" {
		fqbn = "arduino:zephyr:unoq"
	}
	return &ArduinoTool{
		fqbn:     fqbn,
		port:     port,
		protocol: protocol,
		timeout:  120 * time.Second,
	}
}

func (t *ArduinoTool) Name() string { return "arduino" }

func (t *ArduinoTool) Description() string {
	return "Compile and upload Arduino sketches using arduino-cli. " +
		"Actions: compile (compile a sketch and report errors), " +
		"upload (compile then upload to the connected board), " +
		"detect (list connected boards). " +
		"Provide the complete sketch source code in the 'sketch' parameter."
}

func (t *ArduinoTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"action": map[string]any{
				"type":        "string",
				"enum":        []string{"compile", "upload", "detect"},
				"description": "Action to perform: compile (verify the sketch compiles), upload (compile and upload to board), detect (list connected boards)",
			},
			"sketch": map[string]any{
				"type":        "string",
				"description": "Complete Arduino sketch source code (.ino content). Required for compile and upload actions.",
			},
			"fqbn": map[string]any{
				"type":        "string",
				"description": "Fully qualified board name (e.g. arduino:zephyr:unoq). Optional — defaults to the configured board.",
			},
			"port": map[string]any{
				"type":        "string",
				"description": "Upload port (IP address or serial device path). Optional — defaults to the configured port.",
			},
		},
		"required": []string{"action"},
	}
}

func (t *ArduinoTool) Execute(ctx context.Context, args map[string]any) *ToolResult {
	if runtime.GOOS != "linux" {
		return ErrorResult("Arduino tool is only supported on Linux (Arduino Uno Q runs Debian).")
	}

	action, ok := args["action"].(string)
	if !ok {
		return ErrorResult("action is required")
	}

	switch action {
	case "compile":
		return t.compile(ctx, args, false)
	case "upload":
		return t.compile(ctx, args, true)
	case "detect":
		return t.detect(ctx)
	default:
		return ErrorResult(fmt.Sprintf("unknown action: %s (use compile, upload, or detect)", action))
	}
}

func (t *ArduinoTool) compile(ctx context.Context, args map[string]any, upload bool) *ToolResult {
	sketch, ok := args["sketch"].(string)
	if !ok || strings.TrimSpace(sketch) == "" {
		return ErrorResult("sketch is required — provide the complete .ino source code")
	}

	fqbn := t.fqbn
	if v, ok := args["fqbn"].(string); ok && v != "" {
		fqbn = v
	}

	port := t.port
	if v, ok := args["port"].(string); ok && v != "" {
		port = v
	}

	// Write sketch to a temp directory structured as arduino-cli expects:
	// <dir>/<dir>.ino
	tmpDir, err := os.MkdirTemp("", "sensai-sketch-*")
	if err != nil {
		return ErrorResult(fmt.Sprintf("failed to create temp directory: %v", err))
	}
	defer os.RemoveAll(tmpDir)

	sketchName := filepath.Base(tmpDir)
	inoPath := filepath.Join(tmpDir, sketchName+".ino")

	if err := os.WriteFile(inoPath, []byte(sketch), 0o644); err != nil {
		return ErrorResult(fmt.Sprintf("failed to write sketch: %v", err))
	}

	// Build the arduino-cli command
	cliArgs := []string{"compile", "--fqbn", fqbn}

	if upload {
		cliArgs = append(cliArgs, "--upload")
		if port != "" {
			cliArgs = append(cliArgs, "--port", port)
		}
		if t.protocol != "" {
			cliArgs = append(cliArgs, "--protocol", t.protocol)
		}
	}

	cliArgs = append(cliArgs, tmpDir)

	return t.runCLI(ctx, cliArgs, upload)
}

func (t *ArduinoTool) detect(ctx context.Context) *ToolResult {
	return t.runCLI(ctx, []string{"board", "list"}, false)
}

func (t *ArduinoTool) runCLI(ctx context.Context, cliArgs []string, isUpload bool) *ToolResult {
	cmdCtx, cancel := context.WithTimeout(ctx, t.timeout)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, "arduino-cli", cliArgs...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	output := stdout.String()
	if stderr.Len() > 0 {
		if output != "" {
			output += "\n"
		}
		output += stderr.String()
	}

	if err != nil {
		if cmdCtx.Err() == context.DeadlineExceeded {
			return ErrorResult(fmt.Sprintf("arduino-cli timed out after %v", t.timeout))
		}

		// Compilation errors are the most useful output — return them clearly
		action := "Compilation"
		if isUpload {
			action = "Upload"
		}
		return ErrorResult(fmt.Sprintf("%s failed:\n%s", action, output))
	}

	if isUpload {
		return NewToolResult(fmt.Sprintf("Sketch compiled and uploaded successfully.\n%s", output))
	}
	return NewToolResult(fmt.Sprintf("Sketch compiled successfully (no errors).\n%s", output))
}
