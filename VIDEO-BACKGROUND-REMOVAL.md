# Remove White Background from VCB Spinning Ball Video

## Quick Solutions

### Option 1: Use the Batch Script (Recommended)
1. **Install ffmpeg** (one of these methods):
   ```bash
   # Via winget (Windows 10/11)
   winget install ffmpeg

   # Via chocolatey
   choco install ffmpeg

   # Or download manually from: https://ffmpeg.org/download.html
   ```

2. **Run the script**:
   ```bash
   remove-video-background.bat
   ```

3. **Use the output**: The script creates `VCB-Transcript-Video-Transparent.webm` with transparent background

---

### Option 2: Online Tools (No Installation Required)

#### Unscreen.com (Best Quality)
1. Go to: https://www.unscreen.com/
2. Upload `VCB-Transcript-Video.mp4`
3. Wait for processing (automatic AI background removal)
4. Download the result
5. **Note**: Free tier has watermark - Pro version ($9/month) removes it

#### Remove.bg Video
1. Go to: https://www.remove.bg/upload
2. Upload your video
3. Download transparent version

#### Kapwing
1. Go to: https://www.kapwing.com/tools/remove-video-background
2. Upload video
3. Use smart cut or chroma key feature
4. Download result

---

### Option 3: Manual ffmpeg Command

If you want more control, use this command directly:

```bash
# Basic white background removal
ffmpeg -i VCB-Transcript-Video.mp4 -vf "chromakey=white:0.1:0.2" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 VCB-Transcript-Video-Transparent.webm

# For better quality (larger file):
ffmpeg -i VCB-Transcript-Video.mp4 -vf "chromakey=white:0.1:0.2" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 5M VCB-Transcript-Video-Transparent.webm

# For gray/light backgrounds, adjust the color:
ffmpeg -i VCB-Transcript-Video.mp4 -vf "chromakey=0xF0F0F0:0.2:0.3" -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 VCB-Transcript-Video-Transparent.webm
```

**Parameters explained**:
- `chromakey=white:0.1:0.2` - Remove white color with similarity threshold
  - First number (0.1) = similarity (lower = stricter)
  - Second number (0.2) = blend (edge smoothing)
- `-c:v libvpx-vp9` - VP9 codec (supports transparency)
- `-pix_fmt yuva420p` - Pixel format with alpha channel
- `-b:v 2M` - Bitrate (higher = better quality, larger file)

---

### Option 4: Use CSS Blend Mode (Quick Fix)

If you don't want to process the video, use CSS to blend it:

```jsx
// In SplashScreen.jsx or wherever the video is displayed
<video
  autoPlay
  loop
  muted
  style={{
    mixBlendMode: 'darken', // Or 'multiply'
    filter: 'brightness(1.2) contrast(1.1)',
  }}
>
  <source src="/VCB-Transcript-Video.mp4" type="video/mp4" />
</video>
```

Or use a radial gradient overlay:

```jsx
<div style={{ position: 'relative' }}>
  <video autoPlay loop muted>
    <source src="/VCB-Transcript-Video.mp4" type="video/mp4" />
  </video>
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle, transparent 40%, white 70%)',
    pointerEvents: 'none',
  }} />
</div>
```

---

## Recommended Workflow

1. **Best Quality**: Use Unscreen.com (paid) or ffmpeg with high bitrate
2. **Free & Quick**: Use the provided batch script
3. **No Processing**: Use CSS blend modes

---

## After Processing

Once you have the transparent video:

1. **Replace the video**:
   ```bash
   # Rename the transparent version
   mv VCB-Transcript-Video-Transparent.webm public/VCB-Transcript-Video-Transparent.webm
   ```

2. **Update your HTML/JSX** to use WebM:
   ```jsx
   <video autoPlay loop muted>
     <source src="/VCB-Transcript-Video-Transparent.webm" type="video/webm" />
     <source src="/VCB-Transcript-Video.mp4" type="video/mp4" />
   </video>
   ```

3. **Optimize for web**:
   ```bash
   # Compress further if needed
   ffmpeg -i VCB-Transcript-Video-Transparent.webm -c:v libvpx-vp9 -b:v 1M -crf 30 VCB-Transcript-Video-Optimized.webm
   ```

---

## Troubleshooting

### White edges remaining?
Adjust the similarity threshold:
```bash
ffmpeg -i input.mp4 -vf "chromakey=white:0.2:0.3" ...
```

### Video quality too low?
Increase bitrate:
```bash
ffmpeg -i input.mp4 ... -b:v 5M output.webm
```

### File size too large?
Use CRF (Constant Rate Factor):
```bash
ffmpeg -i input.mp4 ... -crf 30 output.webm
```
(CRF range: 0-63, lower = better quality, 30 is balanced)

---

## Resources

- ffmpeg download: https://ffmpeg.org/download.html
- ffmpeg documentation: https://ffmpeg.org/ffmpeg-filters.html#chromakey
- Unscreen (AI removal): https://www.unscreen.com/
- Remove.bg: https://www.remove.bg/
