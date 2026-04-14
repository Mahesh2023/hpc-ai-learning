import React, { useState, useEffect, useRef, useCallback } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────
function resolvePath(cwd, target) {
  if (!target || target === '~') return '/home/student';
  if (target.startsWith('~/')) return '/home/student/' + target.slice(2);
  if (target === '.') return cwd;
  if (target.startsWith('/')) return norm(target);
  return norm(cwd === '/' ? '/' + target : cwd + '/' + target);
}
function norm(p) {
  const s = [];
  for (const t of p.split('/').filter(Boolean)) { if (t === '..') s.pop(); else if (t !== '.') s.push(t); }
  return '/' + s.join('/') || '/';
}
function kids(fs, dir) {
  const px = dir === '/' ? '/' : dir + '/';
  return Object.keys(fs).filter(p => p.startsWith(px) && !p.slice(px.length).includes('/') && p !== dir).sort();
}
function bn(p) { return p.split('/').filter(Boolean).pop() || '/'; }
function octal(o) {
  const m = {0:'---',1:'--x',2:'-w-',3:'-wx',4:'r--',5:'r-x',6:'rw-',7:'rwx'};
  const d = String(o).padStart(3,'0'); return m[d[0]]+m[d[1]]+m[d[2]];
}

// ── Styles ───────────────────────────────────────────────────────────
const S = {
  wrap: { display:'flex', height:'520px', fontFamily:'"Cascadia Code","Fira Code",Consolas,monospace', fontSize:'13px', borderRadius:'8px', overflow:'hidden', border:'1px solid #333', background:'#1a1a2e' },
  tasks: { width:'270px', background:'#16213e', padding:'14px', overflowY:'auto', borderRight:'1px solid #333', flexShrink:0 },
  tTitle: { color:'#00ff88', fontSize:'14px', fontWeight:'bold', marginBottom:'10px', letterSpacing:'1px' },
  tItem: d => ({ padding:'7px 10px', marginBottom:'5px', borderRadius:'4px', background:d?'rgba(0,255,136,0.1)':'rgba(255,255,255,0.03)', color:d?'#00ff88':'#a0a0b0', fontSize:'12px', borderLeft:`3px solid ${d?'#00ff88':'#444'}`, transition:'all .3s' }),
  term: { flex:1, display:'flex', flexDirection:'column', background:'#0a0a0a' },
  bar: { display:'flex', alignItems:'center', padding:'8px 12px', background:'#1a1a2e', gap:'6px' },
  dot: c => ({ width:12, height:12, borderRadius:'50%', background:c }),
  out: { flex:1, padding:'12px', overflowY:'auto', color:'#e0e0e0', lineHeight:'1.6' },
  iRow: { display:'flex', alignItems:'center', padding:'8px 12px', borderTop:'1px solid #222', background:'#0d0d0d' },
  prompt: { color:'#00ff88', marginRight:8, whiteSpace:'nowrap' },
  inp: { flex:1, background:'transparent', border:'none', color:'#e0e0e0', fontFamily:'inherit', fontSize:'inherit', outline:'none', caretColor:'#00ff88' },
  sBar: { display:'flex', justifyContent:'space-between', padding:'4px 12px', background:'#16213e', color:'#666', fontSize:'11px' },
  hBtn: { background:'rgba(255,200,0,0.15)', border:'1px solid #665500', color:'#ffcc00', padding:'2px 8px', borderRadius:3, cursor:'pointer', fontSize:'11px', marginLeft:6 },
  hint: { color:'#ffcc00', fontSize:'12px', padding:'3px 0 0 20px' },
};

// ── Presets ───────────────────────────────────────────────────────────
const PRESETS = {
  'linux-basics': {
    title:'Linux Basics', cwd:'/home/student',
    welcome:'Welcome to Linux Basics! Learn essential commands.\nType "help" for available commands.',
    fs: { '/':{ type:'dir' }, '/home':{ type:'dir' }, '/home/student':{ type:'dir' },
      '/home/student/readme.txt':{ type:'file', content:'Welcome to the HPC learning environment!', permissions:'rw-r--r--', owner:'student' },
      '/home/student/documents':{ type:'dir' },
      '/home/student/documents/notes.txt':{ type:'file', content:'Complete all tasks to proceed.', permissions:'rw-r--r--', owner:'student' }},
    tasks: [
      { id:'1', desc:'Print current working directory', check:s=>s.lastCmd==='pwd', hint:'pwd' },
      { id:'2', desc:'List files in current directory', check:s=>s.lastCmd?.startsWith('ls'), hint:'ls or ls -la' },
      { id:'3', desc:'Create directory "hpc_project"', check:s=>s.fs['/home/student/hpc_project']?.type==='dir', hint:'mkdir hpc_project' },
      { id:'4', desc:'Navigate into hpc_project', check:s=>s.cwd==='/home/student/hpc_project', hint:'cd hpc_project' },
      { id:'5', desc:'Create file "hello.sh"', check:s=>s.fs['/home/student/hpc_project/hello.sh']?.type==='file', hint:'touch hello.sh' },
      { id:'6', desc:'Write "#!/bin/bash" to hello.sh', check:s=>s.fs['/home/student/hpc_project/hello.sh']?.content?.includes('#!/bin/bash'), hint:'echo "#!/bin/bash" > hello.sh' },
      { id:'7', desc:'Copy hello.sh to hello_backup.sh', check:s=>s.fs['/home/student/hpc_project/hello_backup.sh']?.type==='file', hint:'cp hello.sh hello_backup.sh' },
      { id:'8', desc:'Remove the backup file', check:s=>s.removed?.includes('/home/student/hpc_project/hello_backup.sh'), hint:'rm hello_backup.sh' },
    ],
  },
  'file-permissions': {
    title:'File Permissions', cwd:'/home/student',
    welcome:'Learn Linux file permissions and access control.\nUse ls -la to inspect permissions.',
    fs: { '/':{ type:'dir' }, '/home':{ type:'dir' }, '/home/student':{ type:'dir' },
      '/home/student/script.sh':{ type:'file', content:'#!/bin/bash\necho "Hello HPC!"', permissions:'rw-r--r--', owner:'student' },
      '/home/student/data.csv':{ type:'file', content:'id,name,value\n1,alpha,100', permissions:'rw-r--r--', owner:'student' },
      '/home/student/secret.txt':{ type:'file', content:'classified', permissions:'rw-------', owner:'root' },
      '/home/student/shared':{ type:'dir', permissions:'rwxrwxr-x' }},
    tasks: [
      { id:'1', desc:'View detailed permissions with ls -la', check:s=>s.lastCmd?.match(/ls\s+-(la|al)/), hint:'ls -la' },
      { id:'2', desc:'Make script.sh executable', check:s=>s.fs['/home/student/script.sh']?.permissions?.includes('x'), hint:'chmod +x script.sh' },
      { id:'3', desc:'Set data.csv permissions to 755', check:s=>s.fs['/home/student/data.csv']?.permissions==='rwxr-xr-x', hint:'chmod 755 data.csv' },
      { id:'4', desc:'Remove others permissions on secret.txt', check:s=>s.fs['/home/student/secret.txt']?.permissions?.endsWith('---'), hint:'chmod o-rwx secret.txt' },
      { id:'5', desc:'Check the current umask value', check:s=>s.lastCmd==='umask', hint:'umask' },
    ],
  },
  'process-management': {
    title:'Process Management', cwd:'/home/student',
    welcome:'Learn to manage Linux processes.\nUse ps, top, kill, and job control.',
    fs: { '/':{ type:'dir' }, '/home':{ type:'dir' }, '/home/student':{ type:'dir' },
      '/home/student/long_job.sh':{ type:'file', content:'#!/bin/bash\nwhile true; do sleep 1; done', permissions:'rwxr-xr-x', owner:'student' }},
    procs: [
      { pid:1, user:'root', cpu:'0.0', mem:'0.3', cmd:'/sbin/init' },
      { pid:1234, user:'student', cpu:'98.2', mem:'45.1', cmd:'python train_model.py' },
      { pid:1235, user:'student', cpu:'0.1', mem:'2.0', cmd:'bash' },
      { pid:5678, user:'researcher', cpu:'55.0', mem:'30.2', cmd:'matlab -batch sim' },
      { pid:9999, user:'student', cpu:'0.0', mem:'1.0', cmd:'vim config.yaml' },
    ],
    tasks: [
      { id:'1', desc:'List all running processes', check:s=>s.lastCmd?.startsWith('ps'), hint:'ps aux' },
      { id:'2', desc:'Find process using most CPU', check:s=>s.lastOutput?.includes('1234')&&(s.lastCmd?.includes('sort')||s.lastCmd?.includes('--sort')), hint:'ps aux --sort=-%cpu' },
      { id:'3', desc:'Kill process 1234', check:s=>s.killed?.includes(1234), hint:'kill 1234' },
      { id:'4', desc:'Run long_job.sh in background', check:s=>s.bgJobs?.length>0, hint:'./long_job.sh &' },
      { id:'5', desc:'List background jobs', check:s=>s.lastCmd==='jobs', hint:'jobs' },
    ],
  },
  'text-processing': {
    title:'Text Processing', cwd:'/home/student',
    welcome:'Master grep, awk, sed and pipes.\nSample data files are ready.',
    fs: { '/':{ type:'dir' }, '/home':{ type:'dir' }, '/home/student':{ type:'dir' },
      '/home/student/access.log':{ type:'file', content:'192.168.1.10 - - [01/Jan] "GET /index" 200\n10.0.0.5 - - [01/Jan] "POST /api" 500\n192.168.1.10 - - [01/Jan] "GET /css" 200\n172.16.0.1 - - [01/Jan] "GET /index" 404\n10.0.0.5 - - [02/Jan] "GET /health" 200\n192.168.1.10 - - [02/Jan] "POST /submit" 500\n172.16.0.1 - - [02/Jan] "GET /about" 200\n10.0.0.99 - - [02/Jan] "DELETE /api" 403' },
      '/home/student/data.csv':{ type:'file', content:'name,department,salary\nAlice,Engineering,95000\nBob,Marketing,72000\nCharlie,Engineering,102000\nDiana,Marketing,68000\nEve,Engineering,110000\nFrank,HR,65000' },
      '/home/student/errors.log':{ type:'file', content:'[INFO] System started\n[ERROR] Connection timeout on node-05\n[INFO] Job 101 completed\n[ERROR] Out of memory on node-12\n[WARN] Disk usage at 85%\n[ERROR] GPU driver crash on node-05\n[INFO] Backup completed' }},
    tasks: [
      { id:'1', desc:'Find all ERROR lines in errors.log', check:s=>s.lastCmd?.includes('grep')&&s.lastCmd?.includes('ERROR')&&s.lastCmd?.includes('errors'), hint:'grep ERROR errors.log' },
      { id:'2', desc:'Count lines in access.log', check:s=>s.lastCmd?.includes('wc')&&s.lastCmd?.includes('access'), hint:'wc -l access.log' },
      { id:'3', desc:'Extract unique IPs from access.log', check:s=>(s.lastCmd?.includes('cut')||s.lastCmd?.includes('awk'))&&s.lastCmd?.includes('access'), hint:'cut -d" " -f1 access.log | sort | uniq' },
      { id:'4', desc:'Show name column from data.csv', check:s=>s.lastCmd?.includes('cut')&&s.lastCmd?.includes('data.csv'), hint:'cut -d"," -f1 data.csv' },
      { id:'5', desc:'Find Engineering staff earning > 100000', check:s=>s.lastCmd?.includes('awk')&&s.lastCmd?.includes('Engineering'), hint:'awk -F, \'$2=="Engineering"&&$3>100000\' data.csv' },
    ],
  },
  'networking-tools': {
    title:'Networking Tools', cwd:'/home/student',
    welcome:'Explore network diagnostics and remote access.\nYou are on login-node.hpc.cluster.local.',
    fs: { '/':{ type:'dir' }, '/home':{ type:'dir' }, '/home/student':{ type:'dir' },
      '/home/student/upload.dat':{ type:'file', content:'simulation data', permissions:'rw-r--r--' }},
    hosts: { 'compute-node-01':'10.0.1.1', 'compute-node-02':'10.0.1.2', 'storage-server':'10.0.2.1', 'hpc.cluster.local':'10.0.0.1' },
    tasks: [
      { id:'1', desc:'Ping compute-node-01', check:s=>s.lastCmd?.includes('ping')&&s.lastCmd?.includes('compute-node-01'), hint:'ping compute-node-01' },
      { id:'2', desc:'SSH to compute-node-01', check:s=>s.lastCmd?.includes('ssh')&&s.lastCmd?.includes('compute-node-01'), hint:'ssh compute-node-01' },
      { id:'3', desc:'Check open ports', check:s=>s.lastCmd?.match(/netstat|ss/), hint:'ss -tlnp' },
      { id:'4', desc:'Resolve DNS for hpc.cluster.local', check:s=>s.lastCmd?.includes('dig')&&s.lastCmd?.includes('hpc.cluster.local'), hint:'dig hpc.cluster.local' },
      { id:'5', desc:'Download a file with curl or wget', check:s=>s.lastCmd?.startsWith('curl')||s.lastCmd?.startsWith('wget'), hint:'curl http://example.com' },
    ],
  },
  'slurm-commands': {
    title:'SLURM Job Scheduler', cwd:'/home/student',
    welcome:'Learn SLURM cluster management commands.\nYou are on the HPC login node.',
    fs: { '/':{ type:'dir' }, '/home':{ type:'dir' }, '/home/student':{ type:'dir' },
      '/home/student/job.sh':{ type:'file', content:'#!/bin/bash\n#SBATCH --job-name=test\n#SBATCH --nodes=1\n#SBATCH --partition=gpu\npython train.py', permissions:'rwxr-xr-x' },
      '/home/student/train.py':{ type:'file', content:'import torch\nprint("Done")', permissions:'rw-r--r--' }},
    slurm: {
      parts:[{ name:'cpu',avail:'up',nodes:20,alloc:'15/5/0/20' },{ name:'gpu',avail:'up',nodes:8,alloc:'6/2/0/8' },{ name:'highmem',avail:'up',nodes:4,alloc:'3/1/0/4' }],
      jobs:[{ id:12345,name:'train_gpt',user:'researcher1',part:'gpu',st:'RUNNING',time:'2:30:00',n:2 },{ id:12346,name:'data_prep',user:'student',part:'cpu',st:'PENDING',time:'0:00',n:1 },{ id:12347,name:'sim_run',user:'physicist1',part:'highmem',st:'RUNNING',time:'10:15:00',n:1 }],
    },
    tasks: [
      { id:'1', desc:'Check available partitions', check:s=>s.lastCmd?.startsWith('sinfo'), hint:'sinfo' },
      { id:'2', desc:'View the job queue', check:s=>s.lastCmd?.startsWith('squeue'), hint:'squeue' },
      { id:'3', desc:'Submit job.sh', check:s=>s.submitted?.length>0, hint:'sbatch job.sh' },
      { id:'4', desc:'Check your job status', check:s=>s.lastCmd?.includes('squeue')&&s.lastCmd?.includes('student'), hint:'squeue -u student' },
      { id:'5', desc:'Cancel job 12345', check:s=>s.cancelled?.includes(12345), hint:'scancel 12345' },
    ],
  },
  'git-workflow': {
    title:'Git Workflow', cwd:'/home/student/project',
    welcome:'Learn Git version control.\nA sample repo is ready in ~/project.',
    fs: { '/':{ type:'dir' }, '/home':{ type:'dir' }, '/home/student':{ type:'dir' },
      '/home/student/project':{ type:'dir' }, '/home/student/project/.git':{ type:'dir' },
      '/home/student/project/main.py':{ type:'file', content:'def main():\n    print("Hello HPC")\nmain()', permissions:'rw-r--r--' },
      '/home/student/project/README.md':{ type:'file', content:'# HPC Project\nSample project.', permissions:'rw-r--r--' }},
    git:{ branch:'main', branches:['main'], commits:[{hash:'a1b2c3d',msg:'Initial commit',branch:'main',time:'2 days ago'}], staged:[], modified:[], untracked:[], merged:[] },
    tasks: [
      { id:'1', desc:'Check repository status', check:s=>s.lastCmd?.includes('git status'), hint:'git status' },
      { id:'2', desc:'View the commit log', check:s=>s.lastCmd?.includes('git log'), hint:'git log --oneline' },
      { id:'3', desc:'Create branch "feature"', check:s=>s.git?.branches?.includes('feature'), hint:'git branch feature' },
      { id:'4', desc:'Switch to feature branch', check:s=>s.git?.branch==='feature', hint:'git checkout feature' },
      { id:'5', desc:'Add a file and commit', check:s=>s.git?.commits?.some(c=>c.branch==='feature'), hint:'touch f.py; git add .; git commit -m "feat"' },
      { id:'6', desc:'Merge feature into main', check:s=>s.git?.merged?.includes('feature'), hint:'git checkout main; git merge feature' },
    ],
  },
  'docker-basics': {
    title:'Docker Basics', cwd:'/home/student',
    welcome:'Learn Docker container management.\nDocker daemon is running.',
    fs: { '/':{ type:'dir' }, '/home':{ type:'dir' }, '/home/student':{ type:'dir' },
      '/home/student/Dockerfile':{ type:'file', content:'FROM python:3.10-slim\nWORKDIR /app\nCOPY . .\nCMD ["python","app.py"]', permissions:'rw-r--r--' },
      '/home/student/app.py':{ type:'file', content:'from flask import Flask\napp=Flask(__name__)\n@app.route("/")\ndef hello(): return "Hello HPC!"', permissions:'rw-r--r--' },
      '/home/student/requirements.txt':{ type:'file', content:'flask==2.3.0\nnumpy==1.24.0', permissions:'rw-r--r--' }},
    docker:{ images:[{repo:'python',tag:'3.10-slim',id:'abc123',size:'125MB'},{repo:'nvidia/cuda',tag:'11.8-base',id:'def789',size:'2.1GB'}],
      containers:[{id:'c1a2b3',name:'jupyter-lab',image:'jupyter/scipy',status:'Up 2h',ports:'8888->8888'}], pulled:[], built:[], ran:[] },
    tasks: [
      { id:'1', desc:'List Docker images', check:s=>s.lastCmd?.includes('docker images')||s.lastCmd?.includes('docker image ls'), hint:'docker images' },
      { id:'2', desc:'List running containers', check:s=>s.lastCmd?.includes('docker ps'), hint:'docker ps' },
      { id:'3', desc:'Pull ubuntu:22.04', check:s=>s.docker?.pulled?.includes('ubuntu:22.04'), hint:'docker pull ubuntu:22.04' },
      { id:'4', desc:'Build image from Dockerfile', check:s=>s.docker?.built?.length>0, hint:'docker build -t myapp .' },
      { id:'5', desc:'Run a container', check:s=>s.docker?.ran?.length>0, hint:'docker run -d --name myc myapp' },
    ],
  },
};

// ── Component ────────────────────────────────────────────────────────
export default function TerminalSimulator({ config = {} }) {
  const preset = PRESETS[config?.preset] || PRESETS['linux-basics'];
  const [fs, setFs] = useState(() => JSON.parse(JSON.stringify(preset.fs)));
  const [cwd, setCwd] = useState(preset.cwd);
  const [lines, setLines] = useState([{ t:'sys', text:preset.welcome }]);
  const [cmdHist, setCmdHist] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [input, setInput] = useState('');
  const [done, setDone] = useState(new Set());
  const [hintId, setHintId] = useState(null);
  const [lastCmd, setLastCmd] = useState('');
  const [lastOutput, setLastOutput] = useState('');
  const [ex, setEx] = useState(() => ({
    procs: preset.procs ? [...preset.procs] : [],
    hosts: preset.hosts || {},
    slurm: preset.slurm ? JSON.parse(JSON.stringify(preset.slurm)) : null,
    git: preset.git ? JSON.parse(JSON.stringify(preset.git)) : null,
    docker: preset.docker ? JSON.parse(JSON.stringify(preset.docker)) : null,
    killed:[], bgJobs:[], submitted:[], cancelled:[], removed:[],
  }));
  const outRef = useRef(null);
  const inpRef = useRef(null);

  useEffect(() => { if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight; }, [lines]);

  useEffect(() => {
    const st = { fs, cwd, lastCmd, lastOutput, ...ex };
    setDone(prev => {
      const next = new Set(prev); let ch = false;
      for (const t of preset.tasks) if (!next.has(t.id) && t.check(st)) { next.add(t.id); ch = true; }
      return ch ? next : prev;
    });
  }, [fs, cwd, lastCmd, lastOutput, ex, preset.tasks]);

  const out = useCallback((text, t = 'out') => setLines(p => [...p, { t, text }]), []);
  const pr = useCallback(() => `student@hpc:${cwd.replace('/home/student','~')||'~'}$`, [cwd]);

  // ── Command runner ─────────────────────────────────────────────
  function run(raw, pipe) {
    const tk = raw.trim().split(/\s+/), cmd = tk[0], args = tk.slice(1);
    switch (cmd) {
      case 'pwd': return cwd;
      case 'whoami': return 'student';
      case 'hostname': return 'login-node.hpc.cluster.local';
      case 'date': return new Date().toUTCString();
      case 'echo': return args.join(' ').replace(/^["']|["']$/g, '');
      case 'clear': setLines([]); return '';
      case 'umask': return '0022';
      case 'help': return 'Commands: pwd ls cd mkdir touch cat echo cp mv rm chmod grep awk sed\n sort uniq cut wc head tail ps kill jobs git docker sinfo squeue\n sbatch scancel ping ssh dig curl wget netstat ss clear help';

      case 'ls': {
        const long = args.some(a => ['-l','-la','-al'].includes(a));
        const all = args.some(a => ['-a','-la','-al'].includes(a));
        const dir = resolvePath(cwd, args.find(a => !a.startsWith('-')) || '.');
        if (!fs[dir] || fs[dir].type !== 'dir') { out(`ls: '${dir}': No such directory`, 'err'); return null; }
        const ch = kids(fs, dir);
        const rows = ch.map(p => {
          const n = bn(p), e = fs[p], pm = e.permissions || (e.type==='dir'?'rwxr-xr-x':'rw-r--r--');
          return long ? `${e.type==='dir'?'d':'-'}${pm}  1 ${(e.owner||'student').padEnd(8)} ${(e.content?String(e.content.length):'4096').padStart(6)} Jan 1 00:00 ${n}${e.type==='dir'?'/':''}` : n+(e.type==='dir'?'/':'');
        });
        if (all) { rows.unshift(long ? 'drwxr-xr-x  1 student    4096 Jan 1 00:00 ..' : '..'); rows.unshift(long ? 'drwxr-xr-x  1 student    4096 Jan 1 00:00 .' : '.'); }
        return long ? rows.join('\n') : rows.join('  ');
      }
      case 'cd': {
        const t = args[0]||'~', np = resolvePath(cwd, t);
        if (fs[np]?.type==='dir') { setCwd(np); return ''; }
        out(`cd: ${t}: No such directory`, 'err'); return null;
      }
      case 'mkdir': {
        const dirs = args.filter(a => !a.startsWith('-'));
        if (!dirs.length) { out('mkdir: missing operand','err'); return null; }
        for (const d of dirs) { const p = resolvePath(cwd,d); if (fs[p]) out(`mkdir: '${d}' exists`,'err'); else setFs(v=>({...v,[p]:{type:'dir',permissions:'rwxr-xr-x',owner:'student'}})); }
        return '';
      }
      case 'touch': {
        if (!args.length) { out('touch: missing operand','err'); return null; }
        for (const f of args.filter(a=>!a.startsWith('-'))) { const p=resolvePath(cwd,f); if(!fs[p]) setFs(v=>({...v,[p]:{type:'file',content:'',permissions:'rw-r--r--',owner:'student'}})); }
        return '';
      }
      case 'cat': {
        if (!args.length) return pipe||'';
        const r=[];
        for (const f of args.filter(a=>!a.startsWith('-'))) { const p=resolvePath(cwd,f); if(fs[p]?.type==='file') r.push(fs[p].content); else { out(`cat: ${f}: No such file`,'err'); return null; } }
        return r.join('\n');
      }
      case 'cp': {
        if (args.length<2) { out('cp: missing operand','err'); return null; }
        const s=resolvePath(cwd,args[0]),d=resolvePath(cwd,args[1]);
        if (!fs[s]) { out(`cp: '${args[0]}' not found`,'err'); return null; }
        setFs(v=>({...v,[d]:JSON.parse(JSON.stringify(v[s]))})); return '';
      }
      case 'mv': {
        if (args.length<2) { out('mv: missing operand','err'); return null; }
        const s=resolvePath(cwd,args[0]),d=resolvePath(cwd,args[1]);
        if (!fs[s]) { out(`mv: '${args[0]}' not found`,'err'); return null; }
        setFs(v=>{const n={...v};n[d]=n[s];delete n[s];return n;}); return '';
      }
      case 'rm': {
        const rec=args.some(a=>['-r','-rf','-R'].includes(a)), files=args.filter(a=>!a.startsWith('-'));
        if (!files.length) { out('rm: missing operand','err'); return null; }
        for (const f of files) {
          const p=resolvePath(cwd,f);
          if (!fs[p]) { out(`rm: '${f}' not found`,'err'); continue; }
          if (fs[p].type==='dir'&&!rec) { out(`rm: '${f}' is a directory`,'err'); continue; }
          setFs(v=>{const n={...v};Object.keys(n).filter(k=>k===p||k.startsWith(p+'/')).forEach(k=>delete n[k]);return n;});
          setEx(v=>({...v,removed:[...v.removed,p]}));
        }
        return '';
      }
      case 'chmod': {
        if (args.length<2) { out('chmod: missing operand','err'); return null; }
        const mode=args[0], tgt=resolvePath(cwd,args[1]);
        if (!fs[tgt]) { out(`chmod: '${args[1]}' not found`,'err'); return null; }
        setFs(v=>{
          const e={...v[tgt]}, p=(e.permissions||'rw-r--r--').split('');
          if (/^\d{3}$/.test(mode)) e.permissions=octal(mode);
          else if (mode==='+x') { p[2]='x';p[5]='x';p[8]='x';e.permissions=p.join(''); }
          else if (mode==='-x') e.permissions=p.join('').replace(/x/g,'-');
          else if (mode.startsWith('o-')) { if(mode.includes('r'))p[6]='-';if(mode.includes('w'))p[7]='-';if(mode.includes('x'))p[8]='-';e.permissions=p.join(''); }
          return {...v,[tgt]:e};
        }); return '';
      }
      case 'chown': {
        if (args.length<2) { out('chown: missing operand','err'); return null; }
        const tgt=resolvePath(cwd,args[1]);
        if (!fs[tgt]) { out(`chown: '${args[1]}' not found`,'err'); return null; }
        setFs(v=>({...v,[tgt]:{...v[tgt],owner:args[0]}})); return '';
      }
      // ── Text processing ────────────────────────────────────────
      case 'grep': {
        const ga=args.filter(a=>!a.startsWith('-')), pat=ga[0];
        if (!pat) { out('grep: missing pattern','err'); return null; }
        let data=pipe;
        if (!data&&ga[1]) { const p=resolvePath(cwd,ga[1]); data=fs[p]?.content; if(data==null){out(`grep: ${ga[1]} not found`,'err');return null;} }
        const re=new RegExp(pat,args.includes('-i')?'i':'');
        const hits=(data||'').split('\n').filter(l=>re.test(l));
        return args.includes('-c') ? String(hits.length) : hits.join('\n');
      }
      case 'wc': {
        const f=args.find(a=>!a.startsWith('-')), data=pipe||(f&&fs[resolvePath(cwd,f)]?.content)||'';
        const ls=data.split('\n').filter(Boolean);
        if (args.includes('-l')) return `${ls.length}${f?' '+f:''}`;
        return `  ${ls.length}  ${data.split(/\s+/).filter(Boolean).length}  ${data.length}`;
      }
      case 'head': {
        const n=args.includes('-n')?parseInt(args[args.indexOf('-n')+1]):10;
        const f=args.find(a=>!a.startsWith('-')&&a!==String(n)), data=pipe||(f&&fs[resolvePath(cwd,f)]?.content)||'';
        return data.split('\n').slice(0,n).join('\n');
      }
      case 'tail': {
        const n=args.includes('-n')?parseInt(args[args.indexOf('-n')+1]):10;
        const f=args.find(a=>!a.startsWith('-')&&a!==String(n)), data=pipe||(f&&fs[resolvePath(cwd,f)]?.content)||'';
        const ls=data.split('\n'); return ls.slice(Math.max(0,ls.length-n)).join('\n');
      }
      case 'sort': {
        const f=args.find(a=>!a.startsWith('-')), data=pipe||(f&&fs[resolvePath(cwd,f)]?.content)||'';
        const ls=data.split('\n').filter(Boolean).sort(); if(args.includes('-r'))ls.reverse(); return ls.join('\n');
      }
      case 'uniq': {
        const f=args.find(a=>!a.startsWith('-')), data=pipe||(f&&fs[resolvePath(cwd,f)]?.content)||'';
        const ls=data.split('\n').filter(Boolean), seen={}, u=[];
        ls.forEach(l=>{if(!seen[l]){seen[l]=0;u.push(l);}seen[l]++;});
        return args.includes('-c')?u.map(l=>`  ${seen[l]} ${l}`).join('\n'):u.join('\n');
      }
      case 'cut': {
        const f=args.find(a=>!a.startsWith('-')), data=pipe||(f&&fs[resolvePath(cwd,f)]?.content)||'';
        const di=args.indexOf('-d'), del=di>=0?args[di+1].replace(/['"]/g,''):'\t';
        const fi=args.indexOf('-f'), fd=fi>=0?parseInt(args[fi+1])-1:0;
        return data.split('\n').filter(Boolean).map(l=>l.split(del)[fd]||'').join('\n');
      }
      case 'awk': {
        const f=args.find(a=>!a.startsWith('-')&&!a.includes('{')&&!a.includes("'"));
        const data=pipe||(f&&fs[resolvePath(cwd,f)]?.content)||'';
        const fi=args.indexOf('-F'), sep=fi>=0?args[fi+1].replace(/['"]/g,''):null;
        return data.split('\n').filter(Boolean).map(l=>{
          const flds=sep?l.split(sep):l.split(/\s+/), prog=args.find(a=>a.includes('$')||a.includes('{'));
          return prog?prog.replace(/\$(\d+)/g,(_,n)=>flds[parseInt(n)-1]||''):l;
        }).join('\n');
      }
      case 'sed': {
        const data=pipe||'', expr=args.find(a=>a.includes('/'));
        if(!expr)return data;
        const m=expr.match(/s\/([^/]*)\/([^/]*)\/([g]?)/);
        return m?(data.split('\n').map(l=>l.replace(new RegExp(m[1],m[3]),m[2])).join('\n')):data;
      }
      case 'tee': {
        const f=args.find(a=>!a.startsWith('-'));
        if(f&&pipe){const p=resolvePath(cwd,f);setFs(v=>({...v,[p]:{type:'file',content:pipe,permissions:'rw-r--r--',owner:'student'}}));}
        return pipe||'';
      }
      // ── Process management ─────────────────────────────────────
      case 'ps': {
        const procs=ex.procs.filter(p=>!ex.killed.includes(p.pid));
        if(!procs.length) return 'PID TTY      TIME CMD\n1235 pts/0 00:00:00 bash';
        return 'USER         PID %CPU %MEM COMMAND\n'+procs.map(p=>`${p.user.padEnd(12)}${String(p.pid).padStart(5)} ${p.cpu.padStart(5)} ${p.mem.padStart(5)} ${p.cmd}`).join('\n');
      }
      case 'top':
        return `top - simulated\nTasks: ${ex.procs.length}\n%Cpu: 38.2 us\nMem: 64G total\n\n  PID USER       %CPU  %MEM CMD\n`+
          ex.procs.filter(p=>!ex.killed.includes(p.pid)).sort((a,b)=>parseFloat(b.cpu)-parseFloat(a.cpu))
            .map(p=>`${String(p.pid).padStart(5)} ${p.user.padEnd(10)} ${p.cpu.padStart(5)} ${p.mem.padStart(5)} ${p.cmd}`).join('\n');
      case 'kill': {
        const pid=parseInt(args.find(a=>!a.startsWith('-')));
        if(isNaN(pid)){out('kill: usage: kill [-sig] pid','err');return null;}
        if(!ex.procs.find(p=>p.pid===pid)||ex.killed.includes(pid)){out(`kill: (${pid}) - No such process`,'err');return null;}
        setEx(v=>({...v,killed:[...v.killed,pid]})); return '';
      }
      case 'jobs': return ex.bgJobs.length?ex.bgJobs.map((j,i)=>`[${i+1}]  Running  ${j}`).join('\n'):'';
      case 'bg': case 'fg': return ex.bgJobs.length?`${cmd}: job continued`:`${cmd}: no current job`;
      case 'nice': return `Running with adjusted priority: ${args.join(' ')}`;
      case 'nohup': { setEx(v=>({...v,bgJobs:[...v.bgJobs,args.filter(a=>a!=='&').join(' ')]})); return `[1] ${Math.floor(Math.random()*9000)+1000}`; }
      // ── Networking ─────────────────────────────────────────────
      case 'ping': {
        const h=args.find(a=>!a.startsWith('-'));
        if(!h){out('ping: missing host','err');return null;}
        const ip=ex.hosts[h]||'93.184.216.34';
        return `PING ${h} (${ip}) 56(84) bytes.\n64 bytes from ${ip}: seq=1 ttl=64 time=0.42ms\n64 bytes from ${ip}: seq=2 ttl=64 time=0.38ms\n--- ${h} ---\n3 sent, 3 received, 0% loss`;
      }
      case 'ssh': { const h=args.find(a=>!a.startsWith('-')); return h?`Connected to ${h}.\n[student@${h} ~]$ (simulated)`:'usage: ssh host'; }
      case 'scp': return `${args[0]||'file'} -> ${args[1]||'dest'}: 100% transferred`;
      case 'curl': case 'wget': { const u=args.find(a=>!a.startsWith('-'))||'http://example.com'; return cmd==='curl'?`HTTP/1.1 200 OK\n<html>Response from ${u}</html>`:`Saving to: 'index.html'\n100% ${u} downloaded`; }
      case 'netstat': case 'ss': return 'State  Local Address:Port    Peer Address:Port\nLISTEN 0.0.0.0:22       0.0.0.0:*\nLISTEN 0.0.0.0:80       0.0.0.0:*\nLISTEN 0.0.0.0:443      0.0.0.0:*\nESTAB  10.0.0.10:22     10.0.0.5:54321';
      case 'ip': return (args[0]==='addr'||args[0]==='a')?'1: lo: inet 127.0.0.1/8\n2: eth0: inet 10.0.0.10/24':'Usage: ip [addr|route|link]';
      case 'dig': { const d=args.find(a=>!a.startsWith('-')&&!a.startsWith('+')); return `;; ANSWER SECTION:\n${d||'example.com'}.  300  IN  A  ${ex.hosts[d]||'93.184.216.34'}\n;; SERVER: 10.0.0.1#53`; }
      case 'traceroute': { const h=args[0]||'example.com'; return `traceroute to ${h}\n 1 gateway (10.0.0.1) 0.5ms\n 2 ${h} (${ex.hosts[h]||'93.184.216.34'}) 2.1ms`; }
      // ── SLURM ──────────────────────────────────────────────────
      case 'sinfo': {
        if(!ex.slurm){out('sinfo: command not found','err');return null;}
        return 'PARTITION    AVAIL NODES STATE(A/I/O/T)\n'+ex.slurm.parts.map(p=>`${p.name.padEnd(12)} ${p.avail.padEnd(5)} ${String(p.nodes).padStart(5)} ${p.alloc}`).join('\n');
      }
      case 'squeue': {
        if(!ex.slurm){out('squeue: not found','err');return null;}
        let jobs=ex.slurm.jobs; if(args.includes('-u'))jobs=jobs.filter(j=>j.user===args[args.indexOf('-u')+1]);
        return 'JOBID   NAME         USER       PART      STATE    TIME      NODES\n'+jobs.map(j=>`${String(j.id).padEnd(7)} ${j.name.padEnd(12)} ${j.user.padEnd(10)} ${j.part.padEnd(9)} ${j.st.padEnd(8)} ${j.time.padEnd(9)} ${j.n}`).join('\n');
      }
      case 'sbatch': {
        if(!ex.slurm){out('sbatch: not found','err');return null;}
        const f=args.find(a=>!a.startsWith('-'));
        if(!f){out('sbatch: no job script','err');return null;}
        if(!fs[resolvePath(cwd,f)]){out(`sbatch: can't open ${f}`,'err');return null;}
        const jid=12348+(ex.submitted?.length||0);
        setEx(v=>({...v,submitted:[...v.submitted,jid],slurm:{...v.slurm,jobs:[...v.slurm.jobs,{id:jid,name:'test_job',user:'student',part:'gpu',st:'PENDING',time:'0:00',n:1}]}}));
        return `Submitted batch job ${jid}`;
      }
      case 'scancel': {
        if(!ex.slurm){out('scancel: not found','err');return null;}
        const jid=parseInt(args[0]); if(isNaN(jid)){out('scancel: invalid id','err');return null;}
        setEx(v=>({...v,cancelled:[...v.cancelled,jid],slurm:{...v.slurm,jobs:v.slurm.jobs.filter(j=>j.id!==jid)}})); return '';
      }
      case 'sacct': return ex.slurm?'JobID   JobName     State    Elapsed  MaxRSS\n12345   train_gpt   RUNNING  2:30:00  15.2G':'sacct: not found';
      case 'scontrol': return ex.slurm&&args[0]==='show'&&args[1]==='job'?`JobId=${args[2]||'12345'} JobName=train_gpt\n  Partition=gpu NumNodes=2 State=RUNNING`:'Usage: scontrol show job [id]';
      // ── Git ────────────────────────────────────────────────────
      case 'git': {
        const sub=args[0],ga=args.slice(1),g=ex.git;
        if(!g&&sub!=='init'){out('fatal: not a git repository','err');return null;}
        switch(sub){
          case 'init': return 'Initialized empty Git repository';
          case 'status': {
            const st=g.staged?.length?`\nTo commit:\n  ${g.staged.map(f=>`new file: ${f}`).join('\n  ')}`:'';
            const ut=g.untracked?.length?`\nUntracked:\n  ${g.untracked.join('\n  ')}`:'';
            return `On branch ${g.branch}${st}${ut}${!st&&!ut?'\nnothing to commit, working tree clean':''}`;
          }
          case 'log': { const ol=ga.includes('--oneline'); return g.commits.slice().reverse().map(c=>ol?`${c.hash} ${c.msg}`:`commit ${c.hash}\nAuthor: student\nDate: ${c.time}\n\n    ${c.msg}\n`).join(ol?'\n':'\n'); }
          case 'branch': {
            if(ga.length&&!ga[0].startsWith('-')){setEx(v=>({...v,git:{...v.git,branches:[...v.git.branches,ga[0]]}}));return '';}
            return g.branches.map(b=>(b===g.branch?'* ':'  ')+b).join('\n');
          }
          case 'checkout': {
            const br=ga.find(a=>!a.startsWith('-'));
            if(!br) return 'error: specify branch';
            if(ga.includes('-b')){setEx(v=>({...v,git:{...v.git,branch:br,branches:[...v.git.branches,br]}}));return `Switched to new branch '${br}'`;}
            if(g.branches.includes(br)){setEx(v=>({...v,git:{...v.git,branch:br}}));return `Switched to branch '${br}'`;}
            out(`error: '${br}' not found`,'err');return null;
          }
          case 'add': setEx(v=>({...v,git:{...v.git,staged:[...(v.git.staged||[]),...(ga[0]==='.'?['all changes']:ga)],untracked:[]}})); return '';
          case 'commit': {
            const mi=ga.indexOf('-m'), msg=mi>=0?ga.slice(mi+1).join(' ').replace(/^["']|["']$/g,''):'No message';
            const hash=Math.random().toString(36).slice(2,9);
            setEx(v=>({...v,git:{...v.git,commits:[...v.git.commits,{hash,msg,branch:v.git.branch,time:'just now'}],staged:[],modified:[]}}));
            return `[${g.branch} ${hash}] ${msg}\n 1 file changed`;
          }
          case 'merge': {
            const tgt=ga[0]; if(!tgt||!g.branches.includes(tgt)){out(`merge: ${tgt||'?'} not found`,'err');return null;}
            setEx(v=>({...v,git:{...v.git,merged:[...(v.git.merged||[]),tgt]}})); return `Merged '${tgt}' into ${g.branch}.`;
          }
          case 'diff': return g.modified?.length?g.modified.map(f=>`diff a/${f} b/${f}\n-old\n+new`).join('\n'):'';
          case 'push': return `To origin/${g.branch}\n  ${g.branch} -> ${g.branch}`;
          case 'pull': return 'Already up to date.';
          default: out(`git: '${sub}' is not a git command`,'err'); return null;
        }
      }
      // ── Docker ─────────────────────────────────────────────────
      case 'docker': {
        const sub=args[0],da=args.slice(1),dk=ex.docker;
        if(!dk){out('docker: not found in this preset','err');return null;}
        switch(sub){
          case 'images': case 'image': {
            const all=[...dk.images,...dk.pulled.map(p=>{const[r,t]=p.split(':');return{repo:r,tag:t||'latest',id:Math.random().toString(36).slice(2,8),size:'72MB'};}),
              ...dk.built.map(b=>({repo:b,tag:'latest',id:Math.random().toString(36).slice(2,8),size:'256MB'}))];
            return 'REPOSITORY       TAG       IMAGE ID   SIZE\n'+all.map(i=>`${i.repo.padEnd(16)} ${(i.tag||'latest').padEnd(9)} ${i.id}   ${i.size}`).join('\n');
          }
          case 'ps': {
            const all=[...dk.containers,...dk.ran.map(c=>({...c,id:Math.random().toString(36).slice(2,8),status:'Up 1m'}))];
            return 'CONTAINER ID  NAME           IMAGE              STATUS\n'+all.map(c=>`${(c.id||'').padEnd(13)} ${(c.name||'').padEnd(14)} ${(c.image||'').padEnd(18)} ${c.status||''}`).join('\n');
          }
          case 'pull': {
            if(!da[0]){out('docker pull: need image name','err');return null;}
            setEx(v=>({...v,docker:{...v.docker,pulled:[...v.docker.pulled,da[0]]}}));
            return `Pulling ${da[0]}...\nStatus: Downloaded ${da[0]}`;
          }
          case 'build': {
            const ti=da.indexOf('-t'), tag=ti>=0?da[ti+1]:'unnamed';
            setEx(v=>({...v,docker:{...v.docker,built:[...v.docker.built,tag]}}));
            return `Step 1/4 : FROM python:3.10-slim\nStep 2/4 : WORKDIR /app\nStep 3/4 : COPY . .\nStep 4/4 : CMD ["python","app.py"]\nSuccessfully tagged ${tag}:latest`;
          }
          case 'run': {
            const ni=da.indexOf('--name'), name=ni>=0?da[ni+1]:'c_'+Math.random().toString(36).slice(2,6);
            const img=da.find(a=>!a.startsWith('-')&&(da.indexOf(a)===0||(da[da.indexOf(a)-1]!=='--name'&&da[da.indexOf(a)-1]!=='-p')));
            setEx(v=>({...v,docker:{...v.docker,ran:[...v.docker.ran,{name,image:img||'unknown',ports:''}]}}));
            return da.includes('-d')?Math.random().toString(36).slice(2,14):`Started container ${name}`;
          }
          case 'stop': return da[0]||'container';
          case 'rm': return da[0]||'container';
          case 'logs': return '[2024-01-01] Starting application...\n[2024-01-01] Server on port 5000';
          case 'exec': return `Connected to ${da.find(a=>!a.startsWith('-'))||'container'}`;
          default: out(`docker: '${sub}' unknown`,'err'); return null;
        }
      }
      default: {
        if(cmd.startsWith('./')||cmd.startsWith('/')){
          const p=resolvePath(cwd,cmd);
          if(fs[p]?.type==='file'&&fs[p]?.permissions?.includes('x')){
            if(raw.includes('&')){setEx(v=>({...v,bgJobs:[...v.bgJobs,cmd]}));return `[1] ${Math.floor(Math.random()*9000)+1000}`;}
            return `Executing ${cmd}...`;
          }
          if(fs[p]?.type==='file'){out(`bash: ${cmd}: Permission denied`,'err');return null;}
        }
        out(`${cmd}: command not found`,'err'); return null;
      }
    }
  }

  // ── Execute: pipes + redirects ─────────────────────────────────
  function exec(rawCmd) {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;
    out(`${pr()} ${trimmed}`, 'cmd');
    setCmdHist(p => [...p, trimmed]);
    setHistIdx(-1);
    // Pipes
    if (trimmed.includes(' | ')) {
      const cmds = trimmed.split(' | ').map(c => c.trim());
      let pd = '';
      for (const c of cmds) { const o = run(c, pd); if (o === null) { setLastCmd(trimmed); setLastOutput(''); return; } pd = o; }
      if (pd) out(pd);
      setLastCmd(trimmed); setLastOutput(pd); return;
    }
    // Redirects
    const rd = trimmed.match(/^(.+?)\s*(>>?)\s*(\S+)$/);
    if (rd) {
      const [, cp, op, fp] = rd, o = run(cp.trim(), '');
      if (o != null) {
        const tgt = resolvePath(cwd, fp), append = op === '>>';
        setFs(v => ({ ...v, [tgt]: { type:'file', content:(append?(v[tgt]?.content||''):'')+o+'\n', permissions:'rw-r--r--', owner:'student' } }));
      }
      setLastCmd(trimmed); setLastOutput(''); return;
    }
    const output = run(trimmed, '');
    if (output) out(output);
    setLastCmd(trimmed); setLastOutput(output || '');
  }

  // ── Keyboard ───────────────────────────────────────────────────
  const handleKey = useCallback((e) => {
    if (e.key === 'Enter') { exec(input); setInput(''); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (cmdHist.length) { const ni=histIdx===-1?cmdHist.length-1:Math.max(0,histIdx-1); setHistIdx(ni); setInput(cmdHist[ni]); } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if(histIdx>=0){const ni=histIdx+1;if(ni>=cmdHist.length){setHistIdx(-1);setInput('');}else{setHistIdx(ni);setInput(cmdHist[ni]);}} }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const parts=input.split(/\s+/), last=parts[parts.length-1];
      if(last){
        const dir=last.includes('/')?resolvePath(cwd,last.slice(0,last.lastIndexOf('/')+1)):cwd;
        const pfx=last.includes('/')?last.slice(last.lastIndexOf('/')+1):last;
        const matches=kids(fs,dir).map(p=>bn(p)).filter(n=>n.startsWith(pfx));
        if(matches.length===1){parts[parts.length-1]=last.includes('/')?last.slice(0,last.lastIndexOf('/')+1)+matches[0]:matches[0];setInput(parts.join(' '));}
        else if(matches.length>1){out(`${pr()} ${input}`,'cmd');out(matches.join('  '));}
      }
    }
    else if (e.key==='l'&&e.ctrlKey) { e.preventDefault(); setLines([]); }
  }, [input, cmdHist, histIdx, cwd, fs]);

  const completed = done.size, total = preset.tasks.length, allDone = completed === total;

  return (
    <div style={S.wrap}>
      <div style={S.tasks}>
        <div style={S.tTitle}>{preset.title}</div>
        <div style={{color:'#888',fontSize:'11px',marginBottom:10}}>{completed}/{total} completed</div>
        <div style={{height:4,background:'#333',borderRadius:2,marginBottom:14,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${total?(completed/total)*100:0}%`,background:allDone?'#00ff88':'#0066ff',borderRadius:2,transition:'width 0.5s'}}/>
        </div>
        {preset.tasks.map((t,i) => {
          const d = done.has(t.id);
          return (<div key={t.id}>
            <div style={S.tItem(d)}>
              <span style={{marginRight:8,fontWeight:'bold'}}>{d?'\u2713':i+1}</span>{t.desc}
              {!d && <button style={S.hBtn} onClick={()=>setHintId(hintId===t.id?null:t.id)}>{hintId===t.id?'Hide':'Hint'}</button>}
            </div>
            {hintId===t.id && <div style={S.hint}>Hint: {t.hint}</div>}
          </div>);
        })}
        {allDone && <div style={{marginTop:14,padding:10,background:'rgba(0,255,136,0.15)',borderRadius:6,color:'#00ff88',textAlign:'center',fontSize:13,fontWeight:'bold'}}>All tasks completed!</div>}
      </div>
      <div style={S.term}>
        <div style={S.bar}>
          <div style={S.dot('#ff5f57')}/><div style={S.dot('#febc2e')}/><div style={S.dot('#28c840')}/>
          <span style={{color:'#666',marginLeft:8,fontSize:12}}>student@hpc &mdash; {preset.title}</span>
        </div>
        <div ref={outRef} style={S.out} onClick={()=>inpRef.current?.focus()}>
          {lines.map((e,i) => <div key={i} style={{color:e.t==='err'?'#ff5555':e.t==='cmd'?'#00ff88':e.t==='sys'?'#6688cc':'#e0e0e0',whiteSpace:'pre-wrap',wordBreak:'break-all'}}>{e.text}</div>)}
        </div>
        <div style={S.iRow}>
          <span style={S.prompt}>{pr()}</span>
          <input ref={inpRef} style={S.inp} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} spellCheck={false} autoComplete="off" autoFocus/>
        </div>
        <div style={S.sBar}>
          <span>{cwd.replace('/home/student','~')}</span>
          <span>{completed}/{total} tasks | \u2191\u2193 history | Tab complete</span>
        </div>
      </div>
    </div>
  );
}
