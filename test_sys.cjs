const { execFile } = require('child_process'); 
const path = require('path'); 
const scriptPath = path.join(__dirname, 'backend', 'scripts', 'get_system_info.py'); 
console.log('Path:', scriptPath); 
execFile('python', [scriptPath], { timeout: 60000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }, (error, stdout, stderr) => { 
    console.log('Error:', error); 
    console.log('Output length:', stdout ? stdout.length : 0); 
    if(stdout) console.log('Snippet:', stdout.substring(0, 100));
    if(stderr) console.log('Stderr:', stderr);
});
