const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Minimal CORS for local development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const demoDir = process.env.DEMO_DIR; // set this to the folder that contains demo.py
const demoPyPath = process.env.DEMO_PY_PATH; // optional: full path to demo.py
const pythonCmd = process.env.PYTHON_CMD || 'python'; // optional: path to python executable (e.g. venv) - default 'python'

if (!demoDir && !demoPyPath) {
  console.warn('Warning: DEMO_DIR and DEMO_PY_PATH are not set. Please set DEMO_DIR to the folder containing demo.py or DEMO_PY_PATH to the full path to demo.py');
}

app.post('/run', (req, res) => {
  const { prompt, num_steps } = req.body || {};
  if (!prompt) return res.status(400).json({ message: 'Missing prompt in request body' });

  const steps = num_steps ? String(num_steps) : '20';
  // Determine working dir and the script path passed to python
  let cwd = demoDir || path.resolve(__dirname, '..');
  let scriptArg = 'demo.py';

  if (demoPyPath) {
    // Use the full path to the script and set cwd to its directory
    scriptArg = demoPyPath;
    cwd = path.dirname(demoPyPath);
  }

  // Build args for demo.py (scriptArg may be full path)
  const args = [scriptArg, '--prompt', prompt, '--num-steps', steps];

  // Spawn python process using configurable pythonCmd
  const py = spawn(pythonCmd, args, { cwd });

  let stdout = '';
  let stderr = '';

  py.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  py.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  py.on('close', (code) => {
    const success = code === 0;

    // Parse latency from stdout: look for "Image generated in X.XX seconds"
    let latencySeconds = null;
    const latencyMatch = stdout.match(/Image generated in\s+([0-9.]+)\s+seconds/);
    if (latencyMatch) {
      latencySeconds = parseFloat(latencyMatch[1]);
    }

    // Attempt to read the generated image from outputs/image.png
    let imageBase64 = null;
    try {
      const imagePath = path.join(cwd, 'outputs', 'image.png');
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        imageBase64 = imageBuffer.toString('base64');
      }
    } catch (err) {
      // If reading the image fails, just log it on the server side
      console.error('Failed to read generated image:', err);
    }

    res
      .status(success ? 200 : 500)
      .json({
        success,
        code,
        stdout,
        stderr,
        latencySeconds,
        imageBase64,
        message: success ? 'Process completed' : 'Process failed'
      });
  });

  py.on('error', (err) => {
    res.status(500).json({ message: 'Failed to start process', error: String(err) });
  });
});

// Debug endpoint to show which python will be used and its version
app.get('/debug-python', (req, res) => {
  const { spawnSync } = require('child_process');
  try {
    const out = spawnSync(pythonCmd, ['-c', "import sys, json; print(json.dumps({'executable': sys.executable, 'version': sys.version}))"] , { encoding: 'utf8' });
    if (out.error) throw out.error;
    const parsed = JSON.parse(out.stdout || out.stderr);
    res.json({ pythonCmd, demoDir: demoDir || null, demoPyPath: demoPyPath || null, executable: parsed.executable, version: parsed.version });
  } catch (err) {
    res.status(500).json({ pythonCmd, demoDir: demoDir || null, demoPyPath: demoPyPath || null, error: String(err) });
  }
});

app.get('/', (req, res) => res.json({ ok: true, message: 'Runner server is up', DEMO_DIR: demoDir || null }));

app.listen(PORT, () => {
  console.log(`Runner server listening on port ${PORT}. DEMO_DIR=${demoDir || '<not set>'}`);
});
