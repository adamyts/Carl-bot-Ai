console.log('🐾 Starting...');

import { Worker } from 'worker_threads';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { watchFile, unwatchFile } from 'fs';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let worker = null;
let running = false;
let restartTimer = null;
let currentFile = 'main.js';
let isWatching = false; //  زدنا هادي باش ميتعاودش watchFile

function start(file) {
    if (running) return;
    running = true;
    currentFile = file;
    const full = join(__dirname, file);
    console.log('🚀 Starting worker:', file);

    if (worker) {
        try { worker.terminate(); } catch {}
    }

    try {
        worker = new Worker(full);
    } catch (err) {
        console.error('❌ Worker start error:', err);
        running = false;
        return;
    }

    if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
    }

    worker.on('message', (msg) => {
        console.log('[MESSAGE]', msg);
        if (msg === 'restart' || msg === 'reset') restart();
    });

    worker.on('error', (err) => {
        console.error('❌ Worker error:', err);
    });

    worker.on('exit', (code) => {
        console.log('❗ Worker exited with code:', code);
        running = false;

        if (code !== 0) {
            restartTimer = setTimeout(() => {
                console.log('⏳ Auto restart...');
                restart();
            }, 5000); // نقصتها لـ 5 ثواني
        }
    });
    
    //  نقلنا watchFile لبرا باش يخدم مرة وحدة برك
    if(!isWatching){
        isWatching = true;
        watchFile(full, () => {
            console.log('♻️ File updated → Restarting...');
            unwatchFile(full); // مسحناه باش منبقاش نعاودو
            isWatching = false;
            restart();
        });
    }

    if (!rl.listenerCount('line')) {
        rl.on('line', (line) => {
            const cmd = line.trim().toLowerCase();
            if (!cmd) return;
            if (cmd === 'exit') {
                console.log('⛔ Exiting...');
                worker?.terminate();
                process.exit(0);
            }
            if (cmd === 'restart' || cmd === 'reset') {
                console.log('🍃 Restarting...');
                restart();
                return;
            }
            worker?.postMessage(cmd);
        });
    }
}

function restart() {
    console.log('🔄 Restarting worker...');
    if (worker) {
        try { worker.terminate(); } catch {}
    }
    running = false;
    setTimeout(() => {
        start(currentFile);
    }, 1000);
}

start('main.js');
