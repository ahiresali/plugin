# AutoCut - AI-Powered Silence Detection for Adobe Premiere Pro

AutoCut is a CEP (Common Extensibility Platform) plugin for Adobe Premiere Pro that automatically detects and removes silence from your audio tracks using OpenAI's Whisper AI technology.

## ✨ Features

- **AI-Powered Detection**: Uses Whisper AI for accurate silence detection
- **Customizable Thresholds**: Adjust silence threshold (-60dB to 0dB)
- **Flexible Duration Settings**: Set minimum silence duration (100ms to 2000ms)
- **Cut Padding**: Add padding around cuts for natural transitions
- **Real-time Preview**: Visualize detected silence on timeline waveform
- **Batch Processing**: Process single tracks or all audio tracks at once
- **Timeline Integration**: Seamlessly integrates with Premiere Pro's timeline
- **Progress Tracking**: Real-time status updates and progress indicators

## 🔧 Requirements

- Adobe Premiere Pro 2019 or later
- Python 3.7+ with pip
- Windows 10/11, macOS 10.15+, or Linux
- At least 4GB RAM (8GB recommended for larger models)
- Internet connection for initial Whisper model download

## 📦 Installation

### Automatic Installation

**Windows:**
1. Double-click `install.bat` and follow the prompts
2. Run `start_whisper_service.bat` to start the AI service
3. Restart Adobe Premiere Pro

**macOS/Linux:**
1. Run `./install.sh` in Terminal
2. Run `./start_whisper_service.sh` to start the AI service
3. Restart Adobe Premiere Pro

### Manual Installation

1. **Install Python Dependencies:**
   ```bash
   pip install -r python/requirements.txt
   ```

2. **Copy Plugin Files:**
   - Windows: `%USERPROFILE%\AppData\Roaming\Adobe\CEP\extensions\com.autocut.panel\`
   - macOS: `~/Library/Application Support/Adobe/CEP/extensions/com.autocut.panel/`
   - Linux: `~/.config/Adobe/CEP/extensions/com.autocut.panel/`

3. **Enable CEP Debugging:**
   - Windows: Set registry key `HKEY_CURRENT_USER\Software\Adobe\CSXS.11\PlayerDebugMode` to `1`
   - macOS: `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`

## 🚀 Usage

### 1. Start the Whisper Service
Before using AutoCut in Premiere Pro, start the local AI service:

**Windows:** Double-click `start_whisper_service.bat`
**macOS/Linux:** Run `./start_whisper_service.sh`

The service will download the Whisper model on first run (base model ~150MB).

### 2. Open AutoCut in Premiere Pro
1. Open your project in Premiere Pro
2. Go to **Window > Extensions > AutoCut - Silence Detection**
3. The AutoCut panel will open on the side

### 3. Configure Settings
- **Silence Threshold**: Adjust the dB level that defines silence (-60dB to 0dB)
- **Minimum Duration**: Set how long silence must last to be detected (100ms to 2000ms)
- **Cut Padding**: Add time around cuts for smoother transitions (0ms to 500ms)
- **Audio Track**: Choose which track(s) to analyze

### 4. Analyze and Apply
1. Click **"Analyze Silence"** to detect silent segments
2. Review the results and preview on the waveform
3. Click **"Preview Cuts"** to add markers on the timeline
4. Click **"Apply Cuts to Timeline"** to perform the actual cuts

## ⚙️ Advanced Configuration

### Whisper Models
You can use different Whisper models for varying accuracy and speed:

- `tiny`: Fastest, least accurate (~40MB)
- `base`: Good balance, default (~150MB)
- `small`: Better accuracy (~500MB)
- `medium`: High accuracy (~1.5GB)
- `large`: Best accuracy (~3GB)

To change the model, edit the startup script or pass `--model` parameter:
```bash
python whisper_service.py --model small
```

### Service Configuration
The Whisper service accepts these parameters:
- `--port`: Port number (default: 8888)
- `--host`: Host address (default: localhost)
- `--model`: Whisper model to use (default: base)
- `--debug`: Enable debug mode

## 🔍 Troubleshooting

### Plugin Not Visible
1. Ensure CEP debugging is enabled
2. Check that files are in correct extensions directory
3. Restart Premiere Pro completely

### Whisper Service Issues
1. Check Python is installed: `python --version`
2. Verify dependencies: `pip list | grep whisper`
3. Check service logs for error messages
4. Ensure port 8888 is not blocked by firewall

### Analysis Errors
1. Ensure sequence is active in Premiere Pro
2. Check audio tracks contain actual audio clips
3. Verify export permissions for temporary files
4. Try with a smaller audio file first

### Performance Issues
1. Use smaller Whisper model (`tiny` or `base`)
2. Close other memory-intensive applications
3. Reduce audio quality for analysis
4. Process shorter segments at a time

## 🛠️ Development

### File Structure
```
autocut-cep/
├── CSXS/
│   └── manifest.xml          # Plugin configuration
├── css/
│   └── style.css             # UI styling
├── js/
│   ├── CSInterface.js        # CEP communication library
│   └── main.js               # Main UI logic
├── jsx/
│   └── hostscript.jsx        # ExtendScript for Premiere Pro API
├── python/
│   ├── whisper_service.py    # Local Whisper service
│   └── requirements.txt      # Python dependencies
├── index.html                # Main panel interface
└── install.*                 # Installation scripts
```

### Building from Source
1. Clone the repository
2. Install development dependencies
3. Test in Premiere Pro with CEP debugging enabled
4. Package with Adobe Extension Builder (optional)

## 📝 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Ensure you're using the latest version

## 🎯 Roadmap

- [ ] Batch processing for multiple sequences
- [ ] Cloud-based Whisper API option
- [ ] Custom silence detection algorithms
- [ ] Export/import presets
- [ ] Integration with other audio tools
- [ ] Real-time processing during playback

---

**Made with ❤️ for video editors worldwide**