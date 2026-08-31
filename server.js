const express = require("express");
const multer = require("multer");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");

const app = express();

const PORT = process.env.PORT || 3000;
app.set("trust proxy", 1);
app.disable("x-powered-by");

function detectSpeechEngine() {
    const candidates = ["espeak-ng", "espeak"];

    for (const binary of candidates) {
        try {
            const result = require("child_process").execFileSync("which", [binary], {
                stdio: "pipe",
                windowsHide: true
            });
            if (result && result.toString().trim()) return binary;
        } catch (error) {
            // Try the next engine.
        }
    }

    return null;
}

function normalizeSocialVideoUrl(value) {
    if (!value || typeof value !== "string") return "";

    let normalized = value.trim();

    if (!normalized) return "";

    if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
    }

    try {
        const url = new URL(normalized);
        const hostname = url.hostname.toLowerCase();

        if (hostname === "youtu.be") {
            const videoId = url.pathname.replace("/", "");
            if (videoId) {
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        }

        if (hostname.includes("youtube.com") && url.pathname.includes("/shorts/")) {
            const videoId = url.pathname.split("/shorts/")[1]?.split("/")[0];
            if (videoId) {
                return `https://www.youtube.com/watch?v=${videoId}`;
            }
        }

        if (
            hostname.includes("youtube.com") ||
            hostname.includes("youtu.be") ||
            hostname.includes("vimeo.com") ||
            hostname.includes("x.com") ||
            hostname.includes("twitter.com") ||
            hostname.includes("instagram.com") ||
            hostname.includes("facebook.com") ||
            hostname.includes("tiktok.com") ||
            hostname.includes("dailymotion.com") ||
            hostname.includes("rumble.com") ||
            hostname.includes("streamable.com")
        ) {
            return url.toString();
        }

        return url.toString();
    } catch (error) {
        return "";
    }
}

function isValidHttpUrl(value) {
    if (!value || typeof value !== "string") return false;

    const normalized = normalizeSocialVideoUrl(value);
    if (!normalized) return false;

    try {
        const url = new URL(normalized);
        return ["http:", "https:"].includes(url.protocol);
    } catch (error) {
        return false;
    }
}

// ===============================
// FOLDERS
// ===============================

const uploadsDir = path.join(__dirname, "uploads");
const outputsDir = path.join(__dirname, "outputs");

function cleanupOldFiles(dirPath, maxAgeMs = 24 * 60 * 60 * 1000) {
    if (!fs.existsSync(dirPath)) return;

    const now = Date.now();
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const filePath = path.join(dirPath, entry.name);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            cleanupOldFiles(filePath, maxAgeMs);
            if (fs.readdirSync(filePath).length === 0) {
                fs.rmdirSync(filePath, { recursive: true });
            }
            continue;
        }

        if (now - stat.mtimeMs > maxAgeMs) {
            fs.unlinkSync(filePath);
        }
    }
}

// Create folders if they don't exist
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(outputsDir, { recursive: true });
setInterval(() => {
    cleanupOldFiles(uploadsDir);
    cleanupOldFiles(outputsDir);
}, 60 * 60 * 1000);


// ===============================
// MIDDLEWARE
// ===============================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again in a minute." }
});

app.use("/api", apiLimiter);

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

app.use(express.static(path.join(__dirname, "public"), {
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    etag: true,
    lastModified: true
}));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));
app.use("/downloads", express.static(outputsDir, {
    maxAge: 0,
    index: false
}));

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});


// ===============================
// MULTER
// ===============================

const upload = multer({

    dest: uploadsDir,

    limits: {
        fileSize: 100 * 1024 * 1024
    },



fileFilter: (req, file, cb) => {

    const extension = path.extname(file.originalname).toLowerCase();

    if (extension === ".mp4") {
        cb(null, true);
    } else {
        cb(new Error("Only MP4 video files are allowed."));
    }

}







});


// ===============================
// MP4 → MP3
// ===============================

app.post(
    "/api/convert/mp4-to-mp3",
    upload.single("video"),
    (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                message: "No video file uploaded."
            });
        }

        const inputFile = req.file.path;

        const outputName = `toolbox-mp3-${Date.now()}.mp3`;

        const outputFile =
            path.join(outputsDir, outputName);

        console.log("Converting:", req.file.originalname);

        execFile(
            "ffmpeg",
            [
                "-i", inputFile,
                "-vn",
                "-codec:a", "libmp3lame",
                "-q:a", "2",
                "-y",
                outputFile
            ],
            (error, stdout, stderr) => {

                fs.unlink(inputFile, () => {});

                if (error) {
                    console.error(stderr);

                    return res.status(500).json({
                        message: "Video conversion failed."
                    });
                }

                console.log("Conversion completed.");

                res.json({
                    message: "Conversion successful.",
                    downloadUrl: `/downloads/${outputName}`
                });
            }
        );
    }
);

app.post("/api/tts/text-to-mp3", (req, res) => {
    const text = String(req.body?.text || "").trim();

    if (!text) {
        return res.status(400).json({ message: "No text provided for speech synthesis." });
    }

    const qualityConfig = {
        standard: { speed: 160, pitch: 50 },
        warm: { speed: 145, pitch: 42 },
        crisp: { speed: 175, pitch: 58 },
        premium: { speed: 190, pitch: 62 }
    };

    const requestedQuality = String(req.body?.quality || "standard").toLowerCase();
    const parsedRate = Number(req.body?.rate || qualityConfig[requestedQuality]?.speed || 160);
    const parsedPitch = Number(req.body?.pitch || qualityConfig[requestedQuality]?.pitch || 50);

    const safeText = text.replace(/\s+/g, " ").slice(0, 2500);
    const outputName = `toolbox-tts-${Date.now()}.mp3`;
    const outputFile = path.join(outputsDir, outputName);
    const wavFile = path.join(outputsDir, `toolbox-tts-${Date.now()}.wav`);
    const speechEngine = detectSpeechEngine();

    if (!speechEngine) {
        return res.status(400).json({
            message: "Text-to-speech engine not installed. Install espeak-ng or espeak to enable MP3 export."
        });
    }

    const speed = Math.min(260, Math.max(80, parsedRate));
    const pitch = Math.min(99, Math.max(0, parsedPitch));

    const synthesize = () => {
        execFile(
            speechEngine,
            ["-w", wavFile, "-s", String(speed), "-p", String(pitch), safeText],
            (error, stdout, stderr) => {
                if (error) {
                    console.error("Speech synthesis failed:", stderr || error.message);
                    return res.status(500).json({ message: "Speech synthesis failed." });
                }

                execFile(
                    "ffmpeg",
                    [
                        "-y",
                        "-i", wavFile,
                        "-vn",
                        "-ar", "44100",
                        "-acodec", "libmp3lame",
                        "-q:a", "4",
                        outputFile
                    ],
                    (ffmpegError) => {
                        fs.unlink(wavFile, () => {});

                        if (ffmpegError) {
                            console.error("MP3 conversion failed:", ffmpegError.message);
                            return res.status(500).json({ message: "MP3 conversion failed." });
                        }

                        res.json({
                            message: "MP3 generated successfully.",
                            filename: outputName,
                            downloadUrl: `/downloads/${outputName}`
                        });
                    }
                );
            }
        );
    };

    synthesize();
});

app.post("/api/convert/social-video", (req, res) => {
    const incomingUrl = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    const format = String(req.body?.format || "mp4").toLowerCase();
    const normalizedUrl = normalizeSocialVideoUrl(incomingUrl);

    if (!normalizedUrl || !isValidHttpUrl(normalizedUrl)) {
        return res.status(400).json({
            message: "Please provide a valid video URL to convert."
        });
    }

    const normalizedFormat = ["mp3", "mp4"].includes(format) ? format : "mp4";
    const quality = String(req.body?.quality || "720p").toLowerCase();
    const tempDir = path.join(outputsDir, `social-temp-${Date.now()}`);
    const finalName = `toolbox-social-${Date.now()}.${normalizedFormat}`;
    const finalOutput = path.join(outputsDir, finalName);

    fs.mkdirSync(tempDir, { recursive: true });

    const ytDlpArgs = [
        "-m",
        "yt_dlp",
        "--no-warnings",
        "--no-playlist",
        "--restrict-filenames",
        "-o",
        path.join(tempDir, "%(title)s.%(ext)s")
    ];

    if (normalizedFormat === "mp3") {
        ytDlpArgs.push(
            "-f", "bestaudio/best",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "--postprocessor-args", "-ar 44100 -ac 2 -b:a 192k"
        );
    } else {
        ytDlpArgs.push("-f");

        if (quality === "480p") {
            ytDlpArgs.push("bestvideo[height<=480]+bestaudio/best[height<=480]/best");
        } else if (quality === "1080p") {
            ytDlpArgs.push("bestvideo[height<=1080]+bestaudio/best[height<=1080]/best");
        } else {
            ytDlpArgs.push("bestvideo[height<=720]+bestaudio/best[height<=720]/best");
        }

        ytDlpArgs.push("--merge-output-format", "mp4");
    }

    ytDlpArgs.push(normalizedUrl);

    execFile("python3", ytDlpArgs, { timeout: 180000 }, (error, stdout, stderr) => {
        try {
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir).filter((file) => !file.startsWith("."));

                const resultFile = files.find((file) => {
                    const lower = file.toLowerCase();
                    if (normalizedFormat === "mp3") {
                        return lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".webm") || lower.endsWith(".aac") || lower.endsWith(".wav");
                    }
                    return lower.endsWith(".mp4") || lower.endsWith(".mkv") || lower.endsWith(".webm") || lower.endsWith(".mov");
                });

                if (!resultFile) {
                    throw new Error("No video file was created during conversion.");
                }

                const sourceFile = path.join(tempDir, resultFile);

                if (normalizedFormat === "mp3" && !sourceFile.toLowerCase().endsWith(".mp3")) {
                    const tempMp3 = path.join(tempDir, `converted-${Date.now()}.mp3`);
                    execFile(
                        "ffmpeg",
                        [
                            "-y",
                            "-i", sourceFile,
                            "-vn",
                            "-ar", "44100",
                            "-ac", "2",
                            "-codec:a", "libmp3lame",
                            "-b:a", "192k",
                            tempMp3
                        ],
                        (convertError) => {
                            fs.rmSync(tempDir, { recursive: true, force: true });

                            if (convertError) {
                                return res.status(500).json({ message: "The downloaded video could not be converted to MP3 with the requested quality." });
                            }

                            fs.renameSync(tempMp3, finalOutput);
                            return res.json({
                                message: "Social video converted successfully.",
                                filename: finalName,
                                downloadUrl: `/downloads/${finalName}`
                            });
                        }
                    );
                    return;
                }

                fs.renameSync(sourceFile, finalOutput);
                fs.rmSync(tempDir, { recursive: true, force: true });

                return res.json({
                    message: "Social video converted successfully.",
                    filename: finalName,
                    downloadUrl: `/downloads/${finalName}`
                });
            }
        } catch (renameError) {
            console.error("Social conversion cleanup failed:", renameError);
            fs.rmSync(tempDir, { recursive: true, force: true });
            return res.status(500).json({ message: "The video conversion failed. Please try another link." });
        }

        if (error) {
            console.error("Social video conversion failed:", stderr || error.message);
            fs.rmSync(tempDir, { recursive: true, force: true });
            return res.status(500).json({
                message: "Download failed. This link may be private, restricted, or not a direct public video URL. Please try another public video link."
            });
        }

        return res.status(500).json({
            message: "Download failed. The link could not be converted. Please try another public video URL or a different format."
        });
    });
});


// ===============================
// DOWNLOADS
// ===============================

app.get("/downloads/:filename", (req, res) => {

    const filename = path.basename(req.params.filename);
    const filePath = path.join(outputsDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            message: "File not found."
        });
    }

    res.download(filePath, filename, (err) => {

        if (err) {
            console.error("Download error:", err);
        }

    });

});


// ===============================
// ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {

    console.error(err);

    res.status(400).json({
        message: err.message || "Something went wrong."
    });

});


// ===============================
// START SERVER
// ===============================

function startServer(port = PORT) {
    return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
            const address = server.address();
            const actualPort = address && typeof address === "object" ? address.port : port;

            console.log("");
            console.log("================================");
            console.log("      ToolBox LK Server");
            console.log("================================");
            console.log(`Running: http://localhost:${actualPort}`);
            console.log("");
            resolve(server);
        });

        server.on("error", (error) => {
            if (error.code === "EADDRINUSE" && port !== 0) {
                console.warn(`Port ${port} is busy. Retrying on a random free port...`);
                return startServer(0).then(resolve).catch(reject);
            }

            reject(error);
        });
    });
}

if (require.main === module) {
    startServer().catch((error) => {
        console.error("Failed to start server:", error);
        process.exit(1);
    });
}

module.exports = { app, startServer, normalizeSocialVideoUrl, isValidHttpUrl };