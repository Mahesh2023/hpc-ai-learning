/**
 * Expert-level exercises for Lessons 1-13 (Modules 1-3)
 * Each lesson has: 1 quiz, 1 lab (with steps), 1 coding challenge
 * Keyed by lesson ID
 */
export const LESSON_EXERCISES = {

  // ═══════════════════════════════════════════════════════════
  // LESSON 1: Introduction to the Linux Shell
  // ═══════════════════════════════════════════════════════════
  1: [
    {
      id: 101, type: 'quiz',
      title: 'Shell Internals & I/O',
      description: 'Test your understanding of how the Linux shell actually works under the hood.',
      points: 15,
      question: 'When you run `ls -la /tmp 2>/dev/null | wc -l`, which file descriptor is being redirected to /dev/null before the pipe?',
      options: [
        'fd 0 (stdin) — suppresses input to ls',
        'fd 1 (stdout) — discards normal output',
        'fd 2 (stderr) — discards error messages while piping stdout to wc',
        'fd 3 — an extra descriptor opened by the shell for pipes',
      ],
      correct_answer: 2,
      hints: [
        'The > symbol redirects output. The number before it specifies which file descriptor.',
        'fd 2 is stderr. The pipe (|) only connects stdout (fd 1) of ls to stdin of wc.',
      ],
    },
    {
      id: 102, type: 'lab',
      title: 'Pipes, Redirection & Process Substitution',
      description: 'Master the Unix pipeline — the core abstraction that makes shell scripting powerful.',
      points: 40,
      steps: [
        {
          title: 'Count system users',
          instruction: 'Use a pipeline to count how many user accounts exist in /etc/passwd. Pipe the file through wc -l.',
          command: 'cat /etc/passwd | wc -l',
          language: 'bash',
          validation: 'any_output',
          expected_output: '',
          demo_output: '$ cat /etc/passwd | wc -l\n42',
          hint: 'cat reads the file, | passes its stdout to wc, and -l counts lines.',
          explanation: 'Each line in /etc/passwd represents one user account. On HPC clusters, this can be thousands of entries when LDAP/NIS is configured.',
        },
        {
          title: 'Filter and extract fields',
          instruction: 'Extract just the usernames (field 1) of users with /bin/bash as their shell. Use grep to filter and cut to extract.',
          command: 'grep "/bin/bash" /etc/passwd | cut -d: -f1',
          language: 'bash',
          validation: 'any_output',
          demo_output: '$ grep "/bin/bash" /etc/passwd | cut -d: -f1\nroot\nuser1\nhpc_admin',
          hint: 'cut -d: sets the delimiter to colon. -f1 selects the first field (username).',
          explanation: 'On HPC systems, identifying which users have interactive shells is a common admin task. Combine grep + cut for fast field extraction from structured text files.',
        },
        {
          title: 'Redirect stderr separately',
          instruction: 'List contents of /root (which will fail with permission denied) and /tmp. Redirect only stderr to /tmp/errors.log while keeping stdout on screen.',
          command: 'ls /root /tmp 2>/tmp/errors.log\necho "--- Errors captured: ---"\ncat /tmp/errors.log',
          language: 'bash',
          validation: 'any_output',
          demo_output: '$ ls /root /tmp 2>/tmp/errors.log\n/tmp:\nsystemd-private  hsperfdata_root  tmpfiles.d\n--- Errors captured: ---\nls: cannot open directory \'/root\': Permission denied',
          hint: '2> redirects file descriptor 2 (stderr) to a file. stdout (fd 1) still goes to the terminal.',
          explanation: 'In production HPC scripts, always capture stderr separately. Job logs become unreadable when errors are mixed with output. Use 2>errors.log to keep them separate.',
        },
        {
          title: 'Build a monitoring pipeline',
          instruction: 'Create a one-liner that finds the top 5 largest files in /usr, showing size and path, sorted by size descending.',
          command: 'find /usr -type f -printf "%s %p\\n" 2>/dev/null | sort -rn | head -5',
          language: 'bash',
          validation: 'any_output',
          demo_output: '$ find /usr -type f -printf "%s %p\\n" 2>/dev/null | sort -rn | head -5\n52428800 /usr/lib/locale/locale-archive\n14345678 /usr/lib64/libLLVM-14.so\n9876543 /usr/lib64/libicudata.so.69.1\n8765432 /usr/lib64/libclang-cpp.so.14\n7654321 /usr/bin/dockerd',
          hint: 'find -printf "%s %p\\n" prints size and path. sort -rn sorts numerically in reverse. head -5 takes the top 5.',
          explanation: 'Disk space management is critical on HPC clusters with shared filesystems. This pipeline pattern (find | sort | head) is used daily by sysadmins to track down space hogs.',
        },
      ],
    },
    {
      id: 103, type: 'coding',
      title: 'Shell Command Automation with Python',
      description: 'Write a Python script that uses subprocess to gather system information — a common pattern in HPC provisioning and monitoring tools.',
      points: 25,
      starter_code: `import subprocess
import json

def run_cmd(cmd):
    """Run a shell command and return stdout as string."""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()

def gather_system_info():
    """Gather system info using shell commands.
    
    Return a dict with:
    - hostname: from 'hostname' command
    - kernel: from 'uname -r'
    - cpu_count: number of processors (from nproc)
    - uptime: system uptime string
    """
    # TODO: Implement this
    info = {}
    return info

if __name__ == "__main__":
    info = gather_system_info()
    print(json.dumps(info, indent=2))`,
      test_cases: [
        { label: 'Contains hostname', input: '', expected_output: 'hostname', hidden: false },
        { label: 'Contains kernel', input: '', expected_output: 'kernel', hidden: false },
        { label: 'Contains cpu_count', input: '', expected_output: 'cpu_count', hidden: false },
      ],
      hints: [
        'Use the run_cmd() helper: run_cmd("hostname") returns the hostname string.',
        'nproc returns the number of CPUs. Convert to int with int().',
        'uptime can be read from run_cmd("uptime -p") or from /proc/uptime.',
      ],
      solution: `import subprocess
import json

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout.strip()

def gather_system_info():
    return {
        "hostname": run_cmd("hostname"),
        "kernel": run_cmd("uname -r"),
        "cpu_count": int(run_cmd("nproc")),
        "uptime": run_cmd("uptime -p"),
    }

if __name__ == "__main__":
    print(json.dumps(gather_system_info(), indent=2))`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 2: File System & Permissions
  // ═══════════════════════════════════════════════════════════
  2: [
    {
      id: 201, type: 'quiz',
      title: 'Unix Permissions Deep Dive',
      description: 'Advanced permission concepts used on HPC shared filesystems.',
      points: 15,
      question: 'A shared project directory on Lustre needs: owner full access, group read+execute, others nothing. What chmod command and what is the resulting permission in octal?',
      options: [
        'chmod 750 — rwxr-x--- (owner=7, group=5, other=0)',
        'chmod 755 — rwxr-xr-x (owner=7, group=5, other=5)',
        'chmod 700 — rwx------ (owner=7, group=0, other=0)',
        'chmod 770 — rwxrwx--- (owner=7, group=7, other=0)',
      ],
      correct_answer: 0,
      hints: [
        'Read=4, Write=2, Execute=1. "Read+Execute" = 4+1 = 5.',
        'For directories, execute permission means the ability to cd into and list contents.',
      ],
    },
    {
      id: 202, type: 'lab',
      title: 'HPC Project Directory Setup',
      description: 'Set up a shared project directory with proper permissions for a research team — a task you will do regularly on HPC clusters.',
      points: 40,
      steps: [
        {
          title: 'Create project structure',
          instruction: 'Create a project directory structure with data, scripts, and results subdirectories.',
          command: 'mkdir -p /tmp/hpc_project/{data,scripts,results,logs}\nls -la /tmp/hpc_project/',
          language: 'bash',
          validation: 'any_output',
          demo_output: '$ mkdir -p /tmp/hpc_project/{data,scripts,results,logs}\n$ ls -la /tmp/hpc_project/\ntotal 0\ndrwxr-xr-x 6 user user 120 Jan 15 10:30 .\ndrwxrwxrwt 8 root root 180 Jan 15 10:30 ..\ndrwxr-xr-x 2 user user  40 Jan 15 10:30 data\ndrwxr-xr-x 2 user user  40 Jan 15 10:30 logs\ndrwxr-xr-x 2 user user  40 Jan 15 10:30 results\ndrwxr-xr-x 2 user user  40 Jan 15 10:30 scripts',
          hint: 'Brace expansion {a,b,c} creates multiple directories in one command.',
          explanation: 'Consistent project structures make HPC workflows reproducible. The separation of data/scripts/results is a best practice endorsed by FAIR data principles.',
        },
        {
          title: 'Set permissions for shared access',
          instruction: 'Set the setgid bit on the project directory so new files inherit the group. Then set appropriate permissions: scripts executable, data read-only for group.',
          command: 'chmod 2770 /tmp/hpc_project\nchmod 750 /tmp/hpc_project/scripts\nchmod 2750 /tmp/hpc_project/data\nstat -c "%A %a %n" /tmp/hpc_project/*',
          language: 'bash',
          validation: 'any_output',
          demo_output: '$ chmod 2770 /tmp/hpc_project\n$ chmod 750 /tmp/hpc_project/scripts\n$ chmod 2750 /tmp/hpc_project/data\n$ stat -c "%A %a %n" /tmp/hpc_project/*\ndrwxr-s--- 2750 /tmp/hpc_project/data\ndrwxrwx--- 770 /tmp/hpc_project/logs\ndrwxrwx--- 770 /tmp/hpc_project/results\ndrwxr-x--- 750 /tmp/hpc_project/scripts',
          hint: 'The setgid bit (2xxx) ensures new files created in the directory inherit the group ownership instead of the creator primary group.',
          explanation: 'The setgid bit is essential on shared HPC filesystems. Without it, files created by different users get different group ownership, breaking collaborative workflows.',
        },
        {
          title: 'Audit permissions',
          instruction: 'Find any world-readable or world-writable files/dirs under the project. This is a security audit that HPC admins run regularly.',
          command: 'find /tmp/hpc_project -perm -o=r -o -perm -o=w 2>/dev/null\necho "---"\nfind /tmp/hpc_project -type d -exec stat -c "%A %n" {} \\;',
          language: 'bash',
          validation: 'any_output',
          demo_output: '$ find /tmp/hpc_project -perm -o=r -o -perm -o=w 2>/dev/null\n---\n$ find /tmp/hpc_project -type d -exec stat -c "%A %n" {} \\;\ndrwxrws--- /tmp/hpc_project\ndrwxr-s--- /tmp/hpc_project/data\ndrwxrwx--- /tmp/hpc_project/logs\ndrwxrwx--- /tmp/hpc_project/results\ndrwxr-x--- /tmp/hpc_project/scripts',
          hint: '-perm -o=r matches files where "other" has read permission. The -o flag means OR.',
          explanation: 'Regular permission audits prevent data leakage on multi-tenant HPC systems. Many compliance frameworks (HIPAA, ITAR) require no world-readable research data.',
        },
      ],
    },
    {
      id: 203, type: 'coding',
      title: 'Permission Audit Script',
      description: 'Write a Python script that audits file permissions and flags security issues — a real tool used by HPC system administrators.',
      points: 25,
      starter_code: `import os
import stat

def audit_permissions(directory):
    """Audit file permissions under a directory.
    
    Report:
    - World-writable files (security risk)
    - SUID/SGID binaries (privilege escalation risk)
    - Files with no group read (collaboration issue)
    
    Returns dict with counts and lists.
    """
    results = {
        'total_files': 0,
        'world_writable': [],
        'suid_sgid': [],
        'no_group_read': [],
    }
    
    for root, dirs, files in os.walk(directory):
        for name in files:
            path = os.path.join(root, name)
            try:
                st = os.stat(path)
                mode = st.st_mode
                results['total_files'] += 1
                # TODO: Check permissions and populate lists
            except OSError:
                continue
    
    return results

if __name__ == "__main__":
    report = audit_permissions("/usr/bin")
    print(f"Scanned: {report['total_files']} files")
    print(f"World-writable: {len(report['world_writable'])}")
    print(f"SUID/SGID: {len(report['suid_sgid'])}")
    print(f"No group read: {len(report['no_group_read'])}")
    if report['suid_sgid']:
        print("\\nSUID/SGID binaries:")
        for f in report['suid_sgid'][:5]:
            print(f"  {f}")`,
      test_cases: [
        { label: 'Shows total files scanned', input: '', expected_output: 'Scanned:', hidden: false },
        { label: 'Shows SUID/SGID count', input: '', expected_output: 'SUID/SGID:', hidden: false },
      ],
      hints: [
        'Use stat.S_IWOTH to check world-writable: bool(mode & stat.S_IWOTH)',
        'SUID is stat.S_ISUID, SGID is stat.S_ISGID',
        'Group read is stat.S_IRGRP',
      ],
      solution: `import os
import stat

def audit_permissions(directory):
    results = {'total_files': 0, 'world_writable': [], 'suid_sgid': [], 'no_group_read': []}
    for root, dirs, files in os.walk(directory):
        for name in files:
            path = os.path.join(root, name)
            try:
                st = os.stat(path)
                mode = st.st_mode
                results['total_files'] += 1
                if mode & stat.S_IWOTH:
                    results['world_writable'].append(path)
                if mode & (stat.S_ISUID | stat.S_ISGID):
                    results['suid_sgid'].append(path)
                if not (mode & stat.S_IRGRP):
                    results['no_group_read'].append(path)
            except OSError:
                continue
    return results

if __name__ == "__main__":
    report = audit_permissions("/usr/bin")
    print(f"Scanned: {report['total_files']} files")
    print(f"World-writable: {len(report['world_writable'])}")
    print(f"SUID/SGID: {len(report['suid_sgid'])}")
    print(f"No group read: {len(report['no_group_read'])}")
    if report['suid_sgid']:
        print("\\nSUID/SGID binaries:")
        for f in report['suid_sgid'][:5]:
            print(f"  {f}")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 3: Shell Scripting Fundamentals
  // ═══════════════════════════════════════════════════════════
  3: [
    {
      id: 301, type: 'quiz',
      title: 'Bash Quoting & Variable Expansion',
      description: 'Understand how Bash handles variable expansion, quoting, and word splitting.',
      points: 15,
      question: 'Given FILE="my data.txt", which command safely handles the space in the filename?',
      options: [
        'cat $FILE — the shell splits "my" and "data.txt" into two arguments',
        'cat "$FILE" — double quotes prevent word splitting, passes one argument',
        "cat '$FILE' — single quotes prevent expansion, passes literal '$FILE'",
        'cat ${FILE} — braces prevent word splitting',
      ],
      correct_answer: 1,
      hints: [
        'Double quotes preserve variable expansion but prevent word splitting and glob expansion.',
        'Single quotes prevent ALL expansion. Braces are for disambiguation, not quoting.',
      ],
    },
    {
      id: 302, type: 'lab',
      title: 'HPC Job Monitor Script',
      description: 'Build a real monitoring script that checks system health — the kind of script every HPC admin maintains.',
      points: 40,
      steps: [
        {
          title: 'Parse system load',
          instruction: 'Read /proc/loadavg and extract the 1-minute, 5-minute, and 15-minute load averages. Compare against CPU count to detect overload.',
          command: 'CPUS=$(nproc)\nread L1 L5 L15 REST < /proc/loadavg\necho "CPUs: $CPUS"\necho "Load: $L1 $L5 $L15"\nawk "BEGIN { if ($L1 > $CPUS) print \\"WARNING: System overloaded!\\"; else print \\"OK: Load within limits\\" }"',
          language: 'bash',
          validation: 'any_output',
          demo_output: '$ CPUS=$(nproc)\n$ read L1 L5 L15 REST < /proc/loadavg\nCPUs: 8\nLoad: 2.45 1.82 1.23\nOK: Load within limits',
          hint: 'read splits input by whitespace. /proc/loadavg has 5 fields: 1min 5min 15min running/total lastpid',
          explanation: 'Load average > CPU count means processes are waiting for CPU time. On HPC nodes, this often indicates oversubscription or a runaway process.',
        },
        {
          title: 'Check disk usage thresholds',
          instruction: 'Write a loop that checks all mounted filesystems and warns if any exceed 80% usage. Use df and awk.',
          command: "df -h --output=pcent,target | tail -n +2 | while read pct mount; do\n  usage=${pct%\\%}\n  if [ \"$usage\" -gt 80 ] 2>/dev/null; then\n    echo \"CRITICAL: $mount at ${pct} usage\"\n  fi\ndone\necho \"Disk check complete\"",
          language: 'bash',
          validation: 'any_output',
          expected_output: 'Disk check complete',
          demo_output: '$ df check...\nCRITICAL: /home at 87% usage\nDisk check complete',
          hint: '${pct%\\%} removes the trailing % sign. The -gt operator compares integers.',
          explanation: 'Filesystem full is the #1 cause of HPC job failures. Production monitoring scripts check /home, /scratch, and /tmp and alert before they fill up.',
        },
        {
          title: 'Monitor memory with functions',
          instruction: 'Write a bash function that reads /proc/meminfo and calculates the percentage of memory used. Use it to report system memory status.',
          command: "mem_usage() {\n  local total=$(awk '/MemTotal/ {print $2}' /proc/meminfo)\n  local avail=$(awk '/MemAvailable/ {print $2}' /proc/meminfo)\n  local used=$((total - avail))\n  local pct=$((used * 100 / total))\n  echo \"$pct\"\n}\n\nUSAGE=$(mem_usage)\necho \"Memory usage: ${USAGE}%\"\nif [ \"$USAGE\" -gt 90 ]; then\n  echo \"WARNING: High memory usage!\"\nelse\n  echo \"OK: Memory within limits\"\nfi",
          language: 'bash',
          validation: 'any_output',
          expected_output: 'Memory usage:',
          demo_output: '$ mem_usage...\nMemory usage: 45%\nOK: Memory within limits',
          hint: '/proc/meminfo contains MemTotal and MemAvailable in kB. awk extracts the numeric value.',
          explanation: 'On HPC nodes with 256GB+ RAM, monitoring memory prevents OOM kills that terminate long-running jobs. The function pattern lets you reuse this in larger scripts.',
        },
      ],
    },
    {
      id: 303, type: 'coding',
      title: 'SLURM Accounting Data Processor',
      description: 'Write a Python script that parses SLURM sacct output to analyze job efficiency — a real tool used in HPC centers.',
      points: 25,
      starter_code: `import csv
import io

# Simulated sacct output (pipe-delimited)
SACCT_DATA = """JobID|JobName|Partition|AllocCPUS|Elapsed|MaxRSS|State|ExitCode
1001|training_v1|gpu|8|02:30:15|15.2G|COMPLETED|0:0
1002|preprocess|cpu|4|00:45:30|3.1G|COMPLETED|0:0
1003|inference|gpu|2|00:05:12|8.4G|FAILED|1:0
1004|training_v2|gpu|16|04:12:00|31.0G|COMPLETED|0:0
1005|data_load|cpu|1|00:02:15|0.5G|COMPLETED|0:0
1006|training_v3|gpu|8|01:00:00|0.0G|TIMEOUT|0:15
"""

def parse_elapsed(elapsed_str):
    """Convert HH:MM:SS to total seconds."""
    # TODO: implement
    pass

def analyze_jobs(data):
    """Parse sacct data and return analysis.
    
    Returns dict with:
    - total_jobs: count
    - completed: count
    - failed: count  
    - total_cpu_hours: sum of (AllocCPUS * elapsed_seconds) / 3600
    - avg_memory_gb: average MaxRSS across completed jobs
    """
    # TODO: implement
    pass

if __name__ == "__main__":
    report = analyze_jobs(SACCT_DATA)
    for key, value in sorted(report.items()):
        print(f"{key}: {value}")`,
      test_cases: [
        { label: 'Shows total_jobs', input: '', expected_output: 'total_jobs:', hidden: false },
        { label: 'Shows completed count', input: '', expected_output: 'completed:', hidden: false },
        { label: 'Shows cpu_hours', input: '', expected_output: 'total_cpu_hours:', hidden: false },
      ],
      hints: [
        'Use csv.DictReader with delimiter="|" to parse the data.',
        'parse_elapsed: split by ":" then hours*3600 + minutes*60 + seconds.',
        'MaxRSS like "15.2G" can be parsed with float(s.rstrip("G")).',
      ],
      solution: `import csv
import io

SACCT_DATA = """JobID|JobName|Partition|AllocCPUS|Elapsed|MaxRSS|State|ExitCode
1001|training_v1|gpu|8|02:30:15|15.2G|COMPLETED|0:0
1002|preprocess|cpu|4|00:45:30|3.1G|COMPLETED|0:0
1003|inference|gpu|2|00:05:12|8.4G|FAILED|1:0
1004|training_v2|gpu|16|04:12:00|31.0G|COMPLETED|0:0
1005|data_load|cpu|1|00:02:15|0.5G|COMPLETED|0:0
1006|training_v3|gpu|8|01:00:00|0.0G|TIMEOUT|0:15
"""

def parse_elapsed(s):
    parts = s.split(":")
    return int(parts[0])*3600 + int(parts[1])*60 + int(parts[2])

def analyze_jobs(data):
    reader = csv.DictReader(io.StringIO(data.strip()), delimiter='|')
    jobs = list(reader)
    completed = [j for j in jobs if j['State'] == 'COMPLETED']
    mem = [float(j['MaxRSS'].rstrip('G')) for j in completed if j['MaxRSS'] != '0.0G']
    cpu_h = sum(int(j['AllocCPUS']) * parse_elapsed(j['Elapsed']) / 3600 for j in jobs)
    return {
        'total_jobs': len(jobs),
        'completed': len(completed),
        'failed': len([j for j in jobs if j['State'] == 'FAILED']),
        'total_cpu_hours': round(cpu_h, 1),
        'avg_memory_gb': round(sum(mem)/len(mem), 1) if mem else 0,
    }

if __name__ == "__main__":
    for k, v in sorted(analyze_jobs(SACCT_DATA).items()):
        print(f"{k}: {v}")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 4: Process Management & Monitoring
  // ═══════════════════════════════════════════════════════════
  4: [
    {
      id: 401, type: 'quiz',
      title: 'Linux Process States & Signals',
      description: 'Understand process lifecycle — critical for debugging stuck HPC jobs.',
      points: 15,
      question: 'A process in state "D" (uninterruptible sleep) on an HPC node typically indicates:',
      options: [
        'The process is idle and can be safely killed with SIGTERM',
        'The process is waiting for I/O (often NFS/Lustre) and cannot be interrupted even by SIGKILL',
        'The process is a zombie waiting for its parent to call wait()',
        'The process has been stopped by SIGSTOP and is paused',
      ],
      correct_answer: 1,
      hints: [
        'D state processes are waiting for disk/network I/O in kernel space.',
        'On HPC clusters, D state processes usually indicate a hung filesystem (NFS/Lustre timeout).',
      ],
    },
    {
      id: 402, type: 'lab',
      title: '/proc Filesystem Deep Dive',
      description: 'Use the /proc virtual filesystem to inspect running processes — a skill essential for HPC debugging.',
      points: 40,
      steps: [
        {
          title: 'Inspect CPU topology',
          instruction: 'Read /proc/cpuinfo to determine the number of physical cores, threads per core, and CPU model name.',
          command: "echo \"Model: $(grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)\"\necho \"Physical cores: $(grep 'cpu cores' /proc/cpuinfo | head -1 | awk '{print $NF}')\"\necho \"Logical CPUs: $(grep -c ^processor /proc/cpuinfo)\"\necho \"Sockets: $(grep 'physical id' /proc/cpuinfo | sort -u | wc -l)\"",
          language: 'bash',
          validation: 'any_output',
          expected_output: 'Model:',
          demo_output: '$ ...\nModel: Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\nPhysical cores: 24\nLogical CPUs: 96\nSockets: 2',
          hint: 'grep -c counts matching lines. sort -u gives unique values.',
          explanation: 'Knowing CPU topology is essential for MPI process placement. Hyperthreading doubles logical CPUs but not performance for compute-bound HPC workloads.',
        },
        {
          title: 'Memory analysis from /proc',
          instruction: 'Parse /proc/meminfo to calculate total, used, available, and buffer/cache memory. Show values in GB.',
          command: "awk '{\n  if ($1 == \"MemTotal:\") total=$2\n  if ($1 == \"MemAvailable:\") avail=$2\n  if ($1 == \"Buffers:\") buf=$2\n  if ($1 == \"Cached:\") cache=$2\n} END {\n  used = total - avail\n  printf \"Total: %.1f GB\\n\", total/1048576\n  printf \"Used:  %.1f GB\\n\", used/1048576\n  printf \"Avail: %.1f GB\\n\", avail/1048576\n  printf \"Cache: %.1f GB\\n\", (buf+cache)/1048576\n}' /proc/meminfo",
          language: 'bash',
          validation: 'any_output',
          expected_output: 'Total:',
          demo_output: '$ awk ...\nTotal: 251.6 GB\nUsed:  89.3 GB\nAvail: 162.3 GB\nCache: 45.2 GB',
          hint: '/proc/meminfo values are in kB. Divide by 1048576 (1024*1024) to get GB.',
          explanation: 'Linux aggressively uses free RAM for disk cache. MemAvailable is the real indicator of free memory, not MemFree. HPC batch schedulers use this for job placement.',
        },
        {
          title: 'Process resource tracking',
          instruction: 'Examine a running process via /proc/self to see its memory map, file descriptors, and resource limits.',
          command: "echo \"PID: $$\"\necho \"--- Memory (VmRSS = physical RAM) ---\"\ngrep -E 'VmSize|VmRSS|VmPeak' /proc/self/status\necho \"--- Open file descriptors ---\"\nls /proc/self/fd | wc -l\necho \"--- Resource limits ---\"\ngrep -E 'Max open files|Max processes' /proc/self/limits",
          language: 'bash',
          validation: 'any_output',
          expected_output: 'PID:',
          demo_output: '$ ...\nPID: 12345\n--- Memory (VmRSS = physical RAM) ---\nVmPeak:\t  125432 kB\nVmSize:\t  118204 kB\nVmRSS:\t    8432 kB\n--- Open file descriptors ---\n5\n--- Resource limits ---\nMax open files            1024                 1048576              files\nMax processes             63328                63328                processes',
          hint: '/proc/self always refers to the current process. VmRSS is the actual physical memory used.',
          explanation: 'Monitoring VmRSS vs VmSize reveals memory over-commitment. On HPC nodes, tracking these per-job prevents OOM kills. Many SLURM configurations use cgroups to enforce memory limits derived from these metrics.',
        },
      ],
    },
    {
      id: 403, type: 'coding',
      title: 'Process Monitor & Runaway Detector',
      description: 'Write a Python process monitor that detects runaway processes consuming excessive CPU or memory.',
      points: 25,
      starter_code: `import os
import time

def get_process_info(pid):
    """Read process info from /proc/[pid]/stat and status.
    Returns dict with: name, state, cpu_time, rss_kb, or None if process gone.
    """
    try:
        with open(f"/proc/{pid}/stat") as f:
            parts = f.read().split()
        name = parts[1].strip("()")
        state = parts[2]
        utime = int(parts[13])  # user time in jiffies
        stime = int(parts[14])  # system time in jiffies
        rss_pages = int(parts[23])
        page_size = os.sysconf("SC_PAGE_SIZE")
        return {
            "pid": pid,
            "name": name,
            "state": state,
            "cpu_jiffies": utime + stime,
            "rss_kb": rss_pages * page_size // 1024,
        }
    except (FileNotFoundError, ProcessLookupError, IndexError):
        return None

def find_top_processes(n=5):
    """Find top N processes by RSS memory.
    
    Scan /proc/[pid] directories and return sorted list.
    """
    processes = []
    for entry in os.listdir("/proc"):
        if entry.isdigit():
            info = get_process_info(int(entry))
            if info and info["rss_kb"] > 0:
                processes.append(info)
    # TODO: Sort by rss_kb descending and return top n
    pass

if __name__ == "__main__":
    top = find_top_processes(5)
    print(f"{'PID':>8} {'Name':<20} {'State':>5} {'RSS (MB)':>10}")
    print("-" * 48)
    for p in top:
        print(f"{p['pid']:>8} {p['name']:<20} {p['state']:>5} {p['rss_kb']/1024:>10.1f}")`,
      test_cases: [
        { label: 'Shows PID header', input: '', expected_output: 'PID', hidden: false },
        { label: 'Shows RSS column', input: '', expected_output: 'RSS', hidden: false },
      ],
      hints: [
        'sorted(processes, key=lambda p: p["rss_kb"], reverse=True)[:n]',
        'os.listdir("/proc") returns all entries — filter with .isdigit() for PIDs.',
      ],
      solution: `import os

def get_process_info(pid):
    try:
        with open(f"/proc/{pid}/stat") as f:
            parts = f.read().split()
        return {"pid": pid, "name": parts[1].strip("()"), "state": parts[2],
                "cpu_jiffies": int(parts[13])+int(parts[14]),
                "rss_kb": int(parts[23]) * os.sysconf("SC_PAGE_SIZE") // 1024}
    except Exception:
        return None

def find_top_processes(n=5):
    procs = [get_process_info(int(e)) for e in os.listdir("/proc") if e.isdigit()]
    procs = [p for p in procs if p and p["rss_kb"] > 0]
    return sorted(procs, key=lambda p: p["rss_kb"], reverse=True)[:n]

if __name__ == "__main__":
    top = find_top_processes(5)
    print(f"{'PID':>8} {'Name':<20} {'State':>5} {'RSS (MB)':>10}")
    print("-" * 48)
    for p in top:
        print(f"{p['pid']:>8} {p['name']:<20} {p['state']:>5} {p['rss_kb']/1024:>10.1f}")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 5: Networking Basics
  // ═══════════════════════════════════════════════════════════
  5: [
    {
      id: 501, type: 'quiz',
      title: 'HPC Networking & Interconnects',
      description: 'Understand networking concepts critical for HPC cluster performance.',
      points: 15,
      question: 'Why do HPC clusters use InfiniBand (IB) instead of Ethernet for inter-node MPI communication?',
      options: [
        'InfiniBand is cheaper and uses standard RJ45 connectors',
        'InfiniBand provides kernel-bypass RDMA with microsecond latency (1-2us vs 50-100us for TCP) and 200-400 Gbps bandwidth',
        'InfiniBand uses TCP/IP protocol stack optimized for small packets',
        'Ethernet cannot physically connect more than 48 nodes in a single network',
      ],
      correct_answer: 1,
      hints: [
        'RDMA = Remote Direct Memory Access — data moves between nodes without involving the CPU or OS kernel.',
        'MPI latency directly impacts parallel scaling. Every collective operation (Allreduce) pays the latency cost.',
      ],
    },
    {
      id: 502, type: 'lab',
      title: 'Network Diagnostics Toolkit',
      description: 'Master the network diagnostic tools used daily on HPC clusters.',
      points: 40,
      steps: [
        {
          title: 'Inspect network interfaces',
          instruction: 'List all network interfaces, their IP addresses, and MTU sizes. On HPC clusters, look for jumbo frames (MTU 9000).',
          command: "ip -br addr show\necho '---'\nip link show | grep -E 'mtu|state'",
          language: 'bash',
          validation: 'any_output',
          demo_output: '$ ip -br addr show\nlo               UNKNOWN        127.0.0.1/8 ::1/128\neth0             UP             10.0.1.100/24\nib0              UP             10.10.0.100/16\n---\n1: lo: <LOOPBACK,UP> mtu 65536 state UNKNOWN\n2: eth0: <BROADCAST,UP> mtu 1500 state UP\n3: ib0: <BROADCAST,UP> mtu 9000 state UP',
          hint: 'ip -br gives a brief, readable output. Look for interfaces with mtu 9000 (jumbo frames).',
          explanation: 'Jumbo frames (MTU 9000) reduce per-packet overhead for large data transfers. HPC storage (Lustre/GPFS) and MPI traffic benefit significantly from jumbo frames.',
        },
        {
          title: 'Check listening services',
          instruction: 'Find all listening TCP and UDP ports on the system. Identify services relevant to HPC (SLURM, NFS, SSH).',
          command: "ss -tlnp 2>/dev/null | head -15 || netstat -tlnp 2>/dev/null | head -15",
          language: 'bash',
          validation: 'any_output',
          demo_output: '$ ss -tlnp\nState  Recv-Q Send-Q  Local Address:Port  Peer Address:Port\nLISTEN 0      128     0.0.0.0:22          0.0.0.0:*      users:(("sshd",pid=1234))\nLISTEN 0      128     0.0.0.0:6817        0.0.0.0:*      users:(("slurmctld",pid=5678))\nLISTEN 0      128     0.0.0.0:6818        0.0.0.0:*      users:(("slurmd",pid=9012))\nLISTEN 0      64      0.0.0.0:2049        0.0.0.0:*      (NFS)',
          hint: 'ss -tlnp: t=TCP, l=listening, n=numeric ports, p=show process. Port 6817=slurmctld, 6818=slurmd.',
          explanation: 'Knowing which services are listening helps debug connectivity issues. SLURM uses 6817 (controller) and 6818 (compute daemon). NFS uses 2049.',
        },
        {
          title: 'DNS and connectivity test',
          instruction: 'Resolve hostnames and test connectivity to common HPC services. Check if the head node and storage server are reachable.',
          command: "echo \"Hostname: $(hostname -f)\"\necho \"DNS servers:\"\ngrep nameserver /etc/resolv.conf\necho \"---\"\necho \"Testing localhost connectivity:\"\nping -c 2 -W 1 127.0.0.1 2>&1 | tail -1",
          language: 'bash',
          validation: 'any_output',
          expected_output: 'Hostname:',
          demo_output: '$ ...\nHostname: compute-001.cluster.local\nDNS servers:\nnameserver 10.0.0.1\nnameserver 10.0.0.2\n---\nTesting localhost connectivity:\nrtt min/avg/max/mdev = 0.019/0.024/0.029/0.005 ms',
          hint: 'hostname -f shows the FQDN. /etc/resolv.conf lists DNS servers used for name resolution.',
          explanation: 'DNS resolution problems cause mysterious job failures. Always verify FQDN resolution and DNS availability when debugging MPI jobs that fail to connect between nodes.',
        },
      ],
    },
    {
      id: 503, type: 'coding',
      title: 'Node Health Checker',
      description: 'Write a Python health check service that monitors HPC node connectivity — used in real cluster management systems.',
      points: 25,
      starter_code: `import socket
import json
import time

def check_port(host, port, timeout=2):
    """Test if a TCP port is open on a host.
    Returns (reachable: bool, latency_ms: float)
    """
    start = time.time()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((host, port))
        sock.close()
        return True, (time.time() - start) * 1000
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False, -1

def health_check(targets):
    """Check health of multiple services.
    
    targets: list of {"name": str, "host": str, "port": int}
    Returns list of results with status and latency.
    """
    results = []
    for target in targets:
        # TODO: Check each target and build results
        pass
    return results

if __name__ == "__main__":
    targets = [
        {"name": "SSH", "host": "127.0.0.1", "port": 22},
        {"name": "HTTP", "host": "127.0.0.1", "port": 80},
        {"name": "DNS", "host": "127.0.0.1", "port": 53},
    ]
    results = health_check(targets)
    for r in results:
        status = "UP" if r["reachable"] else "DOWN"
        latency = f"{r['latency_ms']:.1f}ms" if r["reachable"] else "N/A"
        print(f"[{status:>4}] {r['name']:<10} {r['host']}:{r['port']}  ({latency})")`,
      test_cases: [
        { label: 'Shows SSH check', input: '', expected_output: 'SSH', hidden: false },
        { label: 'Shows UP or DOWN', input: '', expected_output: 'UP', hidden: true },
      ],
      hints: [
        'Use the check_port helper function for each target.',
        'Build a result dict: {"name": ..., "host": ..., "port": ..., "reachable": bool, "latency_ms": float}',
      ],
      solution: `import socket
import time
import json

def check_port(host, port, timeout=2):
    start = time.time()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((host, port))
        sock.close()
        return True, (time.time() - start) * 1000
    except Exception:
        return False, -1

def health_check(targets):
    results = []
    for t in targets:
        ok, ms = check_port(t["host"], t["port"])
        results.append({**t, "reachable": ok, "latency_ms": ms})
    return results

if __name__ == "__main__":
    targets = [
        {"name": "SSH", "host": "127.0.0.1", "port": 22},
        {"name": "HTTP", "host": "127.0.0.1", "port": 80},
        {"name": "DNS", "host": "127.0.0.1", "port": 53},
    ]
    for r in health_check(targets):
        s = "UP" if r["reachable"] else "DOWN"
        l = f"{r['latency_ms']:.1f}ms" if r["reachable"] else "N/A"
        print(f"[{s:>4}] {r['name']:<10} {r['host']}:{r['port']}  ({l})")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 6: HPC Architecture Overview
  // ═══════════════════════════════════════════════════════════
  6: [
    {
      id: 601, type: 'quiz',
      title: 'Cluster Architecture & NUMA',
      points: 15,
      description: 'Deep understanding of HPC hardware topology.',
      question: 'On a dual-socket server with 2 NUMA nodes, why does pinning MPI ranks to the correct NUMA node matter?',
      options: [
        'It does not matter — all memory access is uniform on modern servers',
        'Cross-NUMA memory access has 2-3x higher latency due to the QPI/UPI interconnect, reducing performance by 20-40%',
        'NUMA only affects GPU workloads, not CPU-bound MPI tasks',
        'It only matters if the system has more than 1TB of RAM',
      ],
      correct_answer: 1,
      hints: [
        'NUMA = Non-Uniform Memory Access. Memory attached to the local socket is faster.',
        'Use numactl --cpunodebind=0 --membind=0 to pin processes to NUMA node 0.',
      ],
    },
    {
      id: 602, type: 'lab',
      title: 'System Topology Inspection',
      description: 'Examine hardware topology — essential for optimizing HPC job placement.',
      points: 40,
      steps: [
        {
          title: 'CPU topology with lscpu',
          instruction: 'Use lscpu to inspect the CPU architecture, cache hierarchy, and NUMA layout.',
          command: "lscpu | grep -E 'Architecture|CPU\\(s\\)|Thread|Core|Socket|NUMA|Cache|Model name'",
          language: 'bash',
          validation: 'any_output',
          expected_output: 'CPU',
          demo_output: '$ lscpu | grep ...\nArchitecture:          x86_64\nCPU(s):                96\nThread(s) per core:    2\nCore(s) per socket:    24\nSocket(s):             2\nNUMA node(s):          2\nModel name:            Intel(R) Xeon(R) Gold 6248R CPU @ 3.00GHz\nL1d cache:             32K\nL1i cache:             32K\nL2 cache:              1024K\nL3 cache:              36608K\nNUMA node0 CPU(s):     0-23,48-71\nNUMA node1 CPU(s):     24-47,72-95',
          hint: 'Threads per core = 2 means hyperthreading is enabled. Physical cores = Sockets * Cores/socket.',
          explanation: 'This is a typical HPC dual-socket node: 2x 24-core Xeons with HT = 96 logical CPUs. The NUMA CPU mapping shows which cores belong to which socket — critical for process binding.',
        },
        {
          title: 'Memory bandwidth estimation',
          instruction: 'Calculate theoretical memory bandwidth from system specs. Read NUMA-specific memory info.',
          command: "echo '=== Memory Channels ==='\nsudo dmidecode -t memory 2>/dev/null | grep -E 'Speed|Size|Locator' | head -12 || echo 'dmidecode requires root'\necho ''\necho '=== Per-NUMA Memory ==='\nif [ -d /sys/devices/system/node ]; then\n  for node in /sys/devices/system/node/node*; do\n    meminfo=\"$node/meminfo\"\n    total=$(awk '/MemTotal/ {printf \"%.1f GB\", $4/1048576}' $meminfo)\n    free=$(awk '/MemFree/ {printf \"%.1f GB\", $4/1048576}' $meminfo)\n    echo \"$(basename $node): Total=$total Free=$free\"\n  done\nfi",
          language: 'bash',
          validation: 'any_output',
          demo_output: '$ ...\n=== Memory Channels ===\ndmidecode requires root\n\n=== Per-NUMA Memory ===\nnode0: Total=125.8 GB Free=62.3 GB\nnode1: Total=125.8 GB Free=71.5 GB',
          hint: 'Each NUMA node has its own memory controller. Unbalanced allocation indicates poor job placement.',
          explanation: 'Equal memory per NUMA node is standard. If one node shows much higher usage, processes may be accessing remote memory, causing performance degradation.',
        },
      ],
    },
    {
      id: 603, type: 'coding',
      title: 'NUMA Topology Analyzer',
      description: 'Write a Python tool to analyze NUMA topology and recommend optimal process placement for MPI jobs.',
      points: 25,
      starter_code: `import os
import re

def parse_numa_topology():
    """Parse NUMA topology from /sys and /proc.
    
    Returns dict with:
    - num_nodes: number of NUMA nodes
    - nodes: list of {id, cpus, memory_gb}
    - total_cores: total physical cores
    - recommendation: string with placement advice
    """
    topology = {"num_nodes": 0, "nodes": [], "total_cores": 0}
    
    # Count NUMA nodes from /sys
    node_dir = "/sys/devices/system/node"
    if os.path.exists(node_dir):
        nodes = [d for d in os.listdir(node_dir) if d.startswith("node")]
        topology["num_nodes"] = len(nodes)
        
        for node_name in sorted(nodes):
            # TODO: Read cpulist and meminfo for each node
            pass
    
    # TODO: Calculate total cores and generate recommendation
    topology["recommendation"] = "TODO"
    return topology

if __name__ == "__main__":
    topo = parse_numa_topology()
    print(f"NUMA Nodes: {topo['num_nodes']}")
    for node in topo['nodes']:
        print(f"  Node {node['id']}: {len(node.get('cpus',[]))} CPUs, {node.get('memory_gb',0):.1f} GB")
    print(f"Total cores: {topo['total_cores']}")
    print(f"Recommendation: {topo['recommendation']}")`,
      test_cases: [
        { label: 'Shows NUMA node count', input: '', expected_output: 'NUMA Nodes:', hidden: false },
        { label: 'Shows recommendation', input: '', expected_output: 'Recommendation:', hidden: false },
      ],
      hints: [
        'Read /sys/devices/system/node/node0/cpulist for CPU list (e.g., "0-23,48-71").',
        'Parse meminfo with: awk "/MemTotal/ {print $4}" node0/meminfo — value is in kB.',
      ],
      solution: `import os

def parse_numa_topology():
    topo = {"num_nodes": 0, "nodes": [], "total_cores": 0}
    node_dir = "/sys/devices/system/node"
    if not os.path.exists(node_dir):
        topo["recommendation"] = "Cannot detect NUMA topology"
        return topo
    nodes = sorted([d for d in os.listdir(node_dir) if d.startswith("node")])
    topo["num_nodes"] = len(nodes)
    for nn in nodes:
        nid = int(nn.replace("node",""))
        cpus = open(f"{node_dir}/{nn}/cpulist").read().strip()
        mem_kb = int([l for l in open(f"{node_dir}/{nn}/meminfo") if "MemTotal" in l][0].split()[3])
        topo["nodes"].append({"id": nid, "cpus": cpus.split(","), "memory_gb": mem_kb/1048576})
        topo["total_cores"] += len(cpus.split(","))
    cores = topo["total_cores"]
    topo["recommendation"] = f"Use --ntasks-per-node={cores} with --cpu-bind=cores for optimal NUMA placement"
    return topo

if __name__ == "__main__":
    t = parse_numa_topology()
    print(f"NUMA Nodes: {t['num_nodes']}")
    for n in t['nodes']:
        print(f"  Node {n['id']}: {len(n['cpus'])} CPUs, {n['memory_gb']:.1f} GB")
    print(f"Total cores: {t['total_cores']}")
    print(f"Recommendation: {t['recommendation']}")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 7: Introduction to SLURM
  // ═══════════════════════════════════════════════════════════
  7: [
    {
      id: 701, type: 'quiz',
      title: 'SLURM Resource Requests',
      points: 15,
      description: 'Master the nuances of SLURM resource allocation.',
      question: 'What is the difference between --ntasks=4 --cpus-per-task=8 versus --ntasks=32 --cpus-per-task=1 when requesting 32 cores?',
      options: [
        'They are identical — both request 32 cores total',
        'First: 4 MPI ranks with 8 OpenMP threads each (hybrid). Second: 32 MPI ranks with 1 thread each (pure MPI)',
        'First requests 4 nodes, second requests 32 nodes',
        'First uses GPUs, second uses only CPUs',
      ],
      correct_answer: 1,
      hints: [
        '--ntasks = number of MPI processes (ranks). --cpus-per-task = threads per rank.',
        'Hybrid MPI+OpenMP codes use fewer ranks with more threads. Pure MPI uses one rank per core.',
      ],
    },
    {
      id: 702, type: 'lab',
      title: 'SLURM Batch Script Authoring',
      description: 'Write production-quality SLURM batch scripts with proper resource requests, error handling, and job management.',
      points: 40,
      steps: [
        {
          title: 'Basic batch script',
          instruction: 'Write a SLURM batch script that requests 2 nodes, 16 tasks per node, 4 GPUs total, with a 4-hour time limit on the "gpu" partition.',
          command: `cat << 'SBATCH'
#!/bin/bash
#SBATCH --job-name=ml_training
#SBATCH --partition=gpu
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=16
#SBATCH --gpus-per-node=2
#SBATCH --time=04:00:00
#SBATCH --mem=64G
#SBATCH --output=logs/%j_%x.out
#SBATCH --error=logs/%j_%x.err
#SBATCH --mail-type=END,FAIL
#SBATCH --mail-user=$USER@example.com

echo "Job $SLURM_JOB_ID started on $(date)"
echo "Running on nodes: $SLURM_NODELIST"
echo "GPUs allocated: $CUDA_VISIBLE_DEVICES"

srun python train.py --distributed
SBATCH
echo "--- Script written ---"`,
          language: 'bash',
          validation: 'any_output',
          expected_output: 'Script written',
          demo_output: '$ cat << ...\n#!/bin/bash\n#SBATCH --job-name=ml_training\n#SBATCH --partition=gpu\n#SBATCH --nodes=2\n...\n--- Script written ---',
          hint: '%j = job ID, %x = job name in output filenames. --gpus-per-node=2 on 2 nodes = 4 GPUs total.',
          explanation: 'Key practices: Always set --time (prevents infinite hangs), use log directories with %j for unique filenames, set --mail-type for notifications, and use srun (not mpirun) for SLURM-aware process launching.',
        },
        {
          title: 'Job array for parameter sweep',
          instruction: 'Write a SLURM job array script that runs 10 experiments with different learning rates. Use SLURM_ARRAY_TASK_ID to select parameters.',
          command: `cat << 'SBATCH'
#!/bin/bash
#SBATCH --job-name=lr_sweep
#SBATCH --array=0-9
#SBATCH --partition=gpu
#SBATCH --gpus=1
#SBATCH --time=01:00:00
#SBATCH --mem=16G
#SBATCH --output=sweep/lr_%a.out

# Learning rate schedule: 1e-5, 2e-5, 5e-5, 1e-4, ...
LR_VALUES=(1e-5 2e-5 5e-5 1e-4 2e-4 5e-4 1e-3 2e-3 5e-3 1e-2)
LR=\${LR_VALUES[$SLURM_ARRAY_TASK_ID]}

echo "Array task $SLURM_ARRAY_TASK_ID: LR=$LR"
python train.py --lr $LR --output results/lr_$LR.json
SBATCH
echo "--- Array script ready ---"`,
          language: 'bash',
          validation: 'any_output',
          expected_output: 'Array script ready',
          demo_output: '$ cat ...\n#!/bin/bash\n#SBATCH --job-name=lr_sweep\n#SBATCH --array=0-9\n...\n--- Array script ready ---',
          hint: '%a in output filename is replaced with the array task ID. Arrays are the efficient way to run parameter sweeps.',
          explanation: 'Job arrays submit 10 jobs with one sbatch command. The scheduler handles them independently — much more efficient than submitting 10 separate scripts. Use --array=0-9%4 to limit concurrency to 4 simultaneous tasks.',
        },
        {
          title: 'Job dependency chain',
          instruction: 'Create a workflow with dependencies: preprocess -> train -> evaluate. Show how to chain jobs with sbatch --dependency.',
          command: `echo "# Submit preprocessing job"
echo 'PREP_ID=$(sbatch --parsable preprocess.sh)'
echo ""
echo "# Submit training after preprocessing completes"
echo 'TRAIN_ID=$(sbatch --parsable --dependency=afterok:$PREP_ID train.sh)'
echo ""
echo "# Submit evaluation after training (run even if training fails)"
echo 'EVAL_ID=$(sbatch --parsable --dependency=afterany:$TRAIN_ID evaluate.sh)'
echo ""
echo "# Show the dependency chain"
echo 'echo "Pipeline: $PREP_ID -> $TRAIN_ID -> $EVAL_ID"'
echo ""
echo "Dependency types:"
echo "  afterok:ID   - run only if dependency completed successfully"
echo "  afternotok:ID - run only if dependency failed"
echo "  afterany:ID  - run regardless of dependency exit status"
echo "  after:ID     - run after dependency starts"`,
          language: 'bash',
          validation: 'any_output',
          expected_output: 'Dependency types:',
          demo_output: '$ ...\n# Submit preprocessing job\nPREP_ID=$(sbatch --parsable preprocess.sh)\n...\nDependency types:\n  afterok:ID   - run only if dependency completed successfully\n  afternotok:ID - run only if dependency failed\n  afterany:ID  - run regardless of dependency exit status\n  after:ID     - run after dependency starts',
          hint: '--parsable returns just the job ID (no text). afterok means "run only after successful completion."',
          explanation: 'Job dependencies are how you build ML pipelines in SLURM. The --parsable flag captures the job ID for chaining. In production, wrap this in a Python orchestrator that handles failures and retries.',
        },
      ],
    },
    {
      id: 703, type: 'coding',
      title: 'SLURM Job Efficiency Analyzer',
      description: 'Build a tool that analyzes SLURM job accounting data to identify waste and optimize resource requests.',
      points: 25,
      starter_code: `# Simulated sacct data for a research group
JOBS = [
    {"id": 1001, "name": "train_bert", "cpus": 32, "gpus": 4, "mem_req_gb": 128, "mem_used_gb": 45, "wall_req": "24:00:00", "wall_used": "06:30:00", "state": "COMPLETED"},
    {"id": 1002, "name": "preprocess", "cpus": 16, "gpus": 0, "mem_req_gb": 64, "mem_used_gb": 12, "wall_req": "08:00:00", "wall_used": "01:15:00", "state": "COMPLETED"},
    {"id": 1003, "name": "train_gpt", "cpus": 64, "gpus": 8, "mem_req_gb": 256, "mem_used_gb": 230, "wall_req": "48:00:00", "wall_used": "47:55:00", "state": "TIMEOUT"},
    {"id": 1004, "name": "inference", "cpus": 8, "gpus": 1, "mem_req_gb": 32, "mem_used_gb": 28, "wall_req": "02:00:00", "wall_used": "00:45:00", "state": "COMPLETED"},
    {"id": 1005, "name": "data_load", "cpus": 4, "gpus": 0, "mem_req_gb": 256, "mem_used_gb": 8, "wall_req": "04:00:00", "wall_used": "00:10:00", "state": "COMPLETED"},
]

def parse_time(t):
    """Convert HH:MM:SS to hours (float)."""
    parts = t.split(":")
    return int(parts[0]) + int(parts[1])/60 + int(parts[2])/3600

def analyze_efficiency(jobs):
    """Analyze job efficiency and generate recommendations.
    
    For each job, calculate:
    - cpu_hours_wasted: (requested - needed) * wall_used
    - mem_efficiency: mem_used / mem_requested * 100
    - time_efficiency: wall_used / wall_requested * 100
    - gpu_hours_wasted: if GPU allocated but utilization is unknown, flag over-request
    
    Returns list of job reports with recommendations.
    """
    reports = []
    for job in jobs:
        wall_used_h = parse_time(job["wall_used"])
        wall_req_h = parse_time(job["wall_req"])
        # TODO: Calculate efficiencies and generate recommendations
        report = {"id": job["id"], "name": job["name"]}
        reports.append(report)
    return reports

if __name__ == "__main__":
    reports = analyze_efficiency(JOBS)
    for r in reports:
        print(f"Job {r['id']} ({r['name']})")
        for k, v in r.items():
            if k not in ('id', 'name'):
                print(f"  {k}: {v}")`,
      test_cases: [
        { label: 'Analyzes train_bert', input: '', expected_output: 'train_bert', hidden: false },
        { label: 'Shows efficiency metric', input: '', expected_output: 'efficiency', hidden: false },
      ],
      hints: [
        'Memory efficiency = mem_used_gb / mem_req_gb * 100. Below 50% = wasteful.',
        'Time efficiency = wall_used / wall_requested * 100. Below 25% = severely over-estimated.',
        'Flag job 1005: requested 256GB but only used 8GB — 97% memory waste.',
      ],
      solution: `JOBS = [
    {"id": 1001, "name": "train_bert", "cpus": 32, "gpus": 4, "mem_req_gb": 128, "mem_used_gb": 45, "wall_req": "24:00:00", "wall_used": "06:30:00", "state": "COMPLETED"},
    {"id": 1002, "name": "preprocess", "cpus": 16, "gpus": 0, "mem_req_gb": 64, "mem_used_gb": 12, "wall_req": "08:00:00", "wall_used": "01:15:00", "state": "COMPLETED"},
    {"id": 1003, "name": "train_gpt", "cpus": 64, "gpus": 8, "mem_req_gb": 256, "mem_used_gb": 230, "wall_req": "48:00:00", "wall_used": "47:55:00", "state": "TIMEOUT"},
    {"id": 1004, "name": "inference", "cpus": 8, "gpus": 1, "mem_req_gb": 32, "mem_used_gb": 28, "wall_req": "02:00:00", "wall_used": "00:45:00", "state": "COMPLETED"},
    {"id": 1005, "name": "data_load", "cpus": 4, "gpus": 0, "mem_req_gb": 256, "mem_used_gb": 8, "wall_req": "04:00:00", "wall_used": "00:10:00", "state": "COMPLETED"},
]

def parse_time(t):
    p = t.split(":")
    return int(p[0]) + int(p[1])/60 + int(p[2])/3600

def analyze_efficiency(jobs):
    reports = []
    for j in jobs:
        wu = parse_time(j["wall_used"])
        wr = parse_time(j["wall_req"])
        me = j["mem_used_gb"] / j["mem_req_gb"] * 100
        te = wu / wr * 100
        recs = []
        if me < 50: recs.append(f"Reduce --mem to {int(j['mem_used_gb']*1.5)}G (was {j['mem_req_gb']}G)")
        if te < 25: recs.append(f"Reduce --time to {int(wu*2)}h (was {int(wr)}h)")
        if j["state"] == "TIMEOUT": recs.append("Job hit time limit — increase --time or optimize code")
        reports.append({"id": j["id"], "name": j["name"], "mem_efficiency": f"{me:.0f}%", "time_efficiency": f"{te:.0f}%", "recommendations": "; ".join(recs) or "Good efficiency"})
    return reports

if __name__ == "__main__":
    for r in analyze_efficiency(JOBS):
        print(f"Job {r['id']} ({r['name']})")
        for k, v in r.items():
            if k not in ('id','name'): print(f"  {k}: {v}")`,
    },
  ],

  // Lessons 8-13 follow the same pattern with domain-specific content
  // Using more compact definitions for brevity

  // ═══════════════════════════════════════════════════════════
  // LESSON 8: Parallel Computing with MPI
  // ═══════════════════════════════════════════════════════════
  8: [
    { id: 801, type: 'quiz', title: 'MPI Communication Patterns', points: 15,
      description: 'Understand MPI collective operations and their performance implications.',
      question: 'Which MPI collective operation has O(log N) time complexity for N processes, making it preferred for large-scale reductions?',
      options: [
        'MPI_Send/Recv in a loop — O(N) sends from every rank to root',
        'MPI_Reduce with tree-based algorithm — O(log N) stages of pairwise reduction',
        'MPI_Gather then local reduce — O(N) data at root',
        'MPI_Alltoall — O(N^2) for all-pairs exchange',
      ],
      correct_answer: 1,
      hints: ['Tree-based algorithms halve the number of active processes at each stage.', 'MPI_Reduce uses internal tree algorithms — much faster than manual point-to-point.'],
    },
    { id: 802, type: 'lab', title: 'MPI Communication Simulation', points: 40,
      description: 'Simulate MPI communication patterns in Python — understand how parallel algorithms scale.',
      steps: [
        { title: 'Simulate ring communication',
          instruction: 'Implement a ring communication pattern where each "rank" sends data to the next and receives from the previous.',
          command: `import time
nranks = 8
data = [f"msg_from_{i}" for i in range(nranks)]
received = [None] * nranks

# Ring: rank i sends to (i+1) % N, receives from (i-1) % N
for i in range(nranks):
    dest = (i + 1) % nranks
    received[dest] = data[i]

for i in range(nranks):
    print(f"Rank {i}: sent to {(i+1)%nranks}, received '{received[i]}' from {(i-1)%nranks}")`,
          language: 'python', validation: 'any_output', expected_output: 'Rank 0:',
          demo_output: "$ python ring.py\nRank 0: sent to 1, received 'msg_from_7' from 7\nRank 1: sent to 2, received 'msg_from_0' from 0\n...",
          hint: 'Ring pattern: each rank communicates with exactly 2 neighbors.',
          explanation: 'Ring allreduce is the standard algorithm for gradient synchronization in distributed deep learning (used by NCCL, Horovod). Each rank sends/receives exactly (N-1)/N of the data in N-1 steps.',
        },
        { title: 'Tree-based reduction',
          instruction: 'Implement a binary tree reduction. At each level, pairs of ranks combine their values. This has O(log N) depth.',
          command: `import math
nranks = 8
values = [i * 10 + 1 for i in range(nranks)]  # Each rank has a value
print(f"Initial values: {values}")

# Binary tree reduction
depth = int(math.log2(nranks))
for level in range(depth):
    stride = 2 ** (level + 1)
    for i in range(0, nranks, stride):
        partner = i + 2**level
        if partner < nranks:
            values[i] += values[partner]
            print(f"  Level {level}: rank {i} += rank {partner} -> {values[i]}")

print(f"\\nResult at rank 0: {values[0]} (expected: {sum(i*10+1 for i in range(nranks))})")`,
          language: 'python', validation: 'any_output', expected_output: 'Result at rank 0:',
          demo_output: "$ python tree_reduce.py\nInitial values: [1, 11, 21, 31, 41, 51, 61, 71]\n  Level 0: rank 0 += rank 1 -> 12\n  Level 0: rank 2 += rank 3 -> 52\n  ...\nResult at rank 0: 288 (expected: 288)",
          hint: 'Each level halves the active ranks. stride = 2^(level+1) determines which ranks participate.',
          explanation: 'Tree reduction completes in log2(N) steps vs N-1 for linear. For 1000 GPUs: tree = 10 steps, linear = 999. This is why MPI_Reduce is always preferred over manual loops.',
        },
      ],
    },
    { id: 803, type: 'coding', title: 'Parallel Speedup Calculator', points: 25,
      description: 'Calculate theoretical and practical speedup using Amdahl\'s Law and Gustafson\'s Law.',
      starter_code: `def amdahl_speedup(p, n):
    """Amdahl's Law: Speedup = 1 / (s + p/n)
    where s = serial fraction = 1-p, p = parallel fraction, n = processors
    """
    s = 1 - p
    return 1 / (s + p / n)

def gustafson_speedup(p, n):
    """Gustafson's Law: Speedup = n - s*(n-1) 
    where s = serial fraction
    Assumes work scales with processors (weak scaling)
    """
    s = 1 - p
    return n - s * (n - 1)

def analyze_scaling(parallel_fraction):
    """Analyze scaling for a given parallel fraction.
    Calculate speedup at 1, 2, 4, 8, 16, 32, 64, 128 cores.
    Show both Amdahl (strong) and Gustafson (weak) scaling.
    Also calculate parallel efficiency = speedup / n_cores.
    """
    cores = [1, 2, 4, 8, 16, 32, 64, 128]
    # TODO: Calculate and print results
    pass

if __name__ == "__main__":
    print("=== 95% parallel (typical well-optimized HPC code) ===")
    analyze_scaling(0.95)
    print("\\n=== 80% parallel (code with significant serial bottleneck) ===")
    analyze_scaling(0.80)`,
      test_cases: [
        { label: 'Shows 95% parallel analysis', input: '', expected_output: '95%', hidden: false },
        { label: 'Shows speedup values', input: '', expected_output: 'Amdahl', hidden: false },
      ],
      hints: [
        'Efficiency = speedup / n_cores * 100. Below 50% means diminishing returns.',
        'Amdahl limit for 95% parallel = 1/(1-0.95) = 20x max speedup regardless of core count.',
      ],
      solution: `def amdahl_speedup(p, n):
    return 1 / ((1-p) + p/n)

def gustafson_speedup(p, n):
    return n - (1-p)*(n-1)

def analyze_scaling(pf):
    cores = [1, 2, 4, 8, 16, 32, 64, 128]
    print(f"{'Cores':>6} {'Amdahl':>10} {'Gustafson':>10} {'Efficiency':>10}")
    for n in cores:
        a = amdahl_speedup(pf, n)
        g = gustafson_speedup(pf, n)
        eff = a / n * 100
        print(f"{n:>6} {a:>10.2f} {g:>10.1f} {eff:>9.1f}%")
    print(f"  Amdahl limit: {1/(1-pf):.1f}x")

if __name__ == "__main__":
    print("=== 95% parallel (typical well-optimized HPC code) ===")
    analyze_scaling(0.95)
    print("\\n=== 80% parallel (code with significant serial bottleneck) ===")
    analyze_scaling(0.80)`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 9: GPU Computing Basics
  // ═══════════════════════════════════════════════════════════
  9: [
    { id: 901, type: 'quiz', title: 'GPU Architecture & Memory Hierarchy', points: 15,
      description: 'Understand the GPU memory hierarchy that determines kernel performance.',
      question: 'When a CUDA kernel accesses global memory, what is the key requirement for maximum throughput (coalesced access)?',
      options: [
        'Each thread must access a different cache line for parallelism',
        'Consecutive threads in a warp must access consecutive memory addresses so the hardware combines them into fewer transactions',
        'All threads must access the same memory address (broadcast)',
        'Threads should use random access patterns to avoid bank conflicts',
      ],
      correct_answer: 1,
      hints: ['A warp = 32 threads executing in lockstep. Memory transactions are 128 bytes (one cache line).', 'If 32 threads each access 4 bytes at consecutive addresses = one 128-byte transaction. Random access = up to 32 transactions.'],
    },
    { id: 902, type: 'lab', title: 'GPU Utilization Analysis', points: 40,
      description: 'Parse nvidia-smi output to monitor GPU health — a daily task for GPU cluster administrators.',
      steps: [
        { title: 'Parse nvidia-smi output',
          instruction: 'Write a script that parses nvidia-smi query output to extract GPU utilization, memory usage, and temperature.',
          command: `# Simulated nvidia-smi output (real format)
NVIDIA_SMI="""GPU,Name,Temp,Util,MemUsed,MemTotal,Power
0,NVIDIA A100-SXM4-80GB,45,92,65536,81920,287
1,NVIDIA A100-SXM4-80GB,43,88,72000,81920,275
2,NVIDIA A100-SXM4-80GB,51,95,78000,81920,310
3,NVIDIA A100-SXM4-80GB,38,12,4096,81920,85"""

import csv
import io
reader = csv.DictReader(io.StringIO(NVIDIA_SMI.strip()))
for gpu in reader:
    util = int(gpu['Util'])
    mem_pct = int(gpu['MemUsed']) / int(gpu['MemTotal']) * 100
    status = "OK" if util > 50 else "IDLE"
    print(f"GPU {gpu['GPU']}: {gpu['Name'][:20]:20s} | Util: {util:3d}% | Mem: {mem_pct:.0f}% | Temp: {gpu['Temp']}C | {status}")`,
          language: 'python', validation: 'any_output', expected_output: 'GPU 0:',
          demo_output: "$ python gpu_check.py\nGPU 0: NVIDIA A100-SXM4-80G | Util:  92% | Mem: 80% | Temp: 45C | OK\nGPU 1: NVIDIA A100-SXM4-80G | Util:  88% | Mem: 88% | Temp: 43C | OK\nGPU 2: NVIDIA A100-SXM4-80G | Util:  95% | Mem: 95% | Temp: 51C | OK\nGPU 3: NVIDIA A100-SXM4-80G | Util:  12% | Mem:  5% | Temp: 38C | IDLE",
          hint: 'nvidia-smi --query-gpu=index,name,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw --format=csv produces this format.',
          explanation: 'GPU 3 shows 12% utilization with 5% memory — likely allocated but not being used effectively. This wastes $10+/hour on cloud. HPC admins use this to detect idle GPUs and reallocate resources.',
        },
        { title: 'GPU memory bandwidth calculation',
          instruction: 'Calculate theoretical vs achievable memory bandwidth for different GPU architectures. This determines if a kernel is memory-bound or compute-bound.',
          command: `gpus = {
    "V100": {"mem_bw_gbps": 900, "fp32_tflops": 15.7, "mem_gb": 32},
    "A100": {"mem_bw_gbps": 2039, "fp32_tflops": 19.5, "mem_gb": 80},
    "H100": {"mem_bw_gbps": 3350, "fp32_tflops": 67.0, "mem_gb": 80},
}

print(f"{'GPU':<8} {'Mem BW':>10} {'FP32 TFLOPS':>12} {'Arith Int':>12} {'VRAM':>6}")
print("-" * 52)
for name, specs in gpus.items():
    # Arithmetic intensity threshold (FLOPS/Byte) where compute becomes bottleneck
    ai = specs["fp32_tflops"] * 1000 / specs["mem_bw_gbps"]
    print(f"{name:<8} {specs['mem_bw_gbps']:>8} GB/s {specs['fp32_tflops']:>10.1f} TF {ai:>10.1f} F/B {specs['mem_gb']:>4} GB")

print("\\nIf your kernel does < AI threshold FLOPS per byte loaded, it is MEMORY-BOUND.")
print("Matrix multiply: ~100 F/B (compute-bound). Element-wise ops: ~1 F/B (memory-bound).")`,
          language: 'python', validation: 'any_output', expected_output: 'GPU',
          demo_output: "$ python roofline.py\nGPU      Mem BW   FP32 TFLOPS    Arith Int   VRAM\n----------------------------------------------------\nV100       900 GB/s       15.7 TF       17.4 F/B   32 GB\nA100      2039 GB/s       19.5 TF        9.6 F/B   80 GB\nH100      3350 GB/s       67.0 TF       20.0 F/B   80 GB",
          hint: 'Arithmetic intensity = FLOPS/Byte. If your kernel is below this threshold, adding more compute does not help.',
          explanation: 'The roofline model tells you whether to optimize memory access or computation. Most DL training is compute-bound (matmuls), but data loading and normalization layers are memory-bound.',
        },
      ],
    },
    { id: 903, type: 'coding', title: 'Matrix Multiply Performance Model', points: 25,
      description: 'Model the performance difference between naive and tiled matrix multiplication to understand GPU optimization.',
      starter_code: `import time
import math

def naive_matmul(A, B, N):
    """Naive O(N^3) matrix multiply — simulates unoptimized GPU kernel."""
    C = [[0]*N for _ in range(N)]
    for i in range(N):
        for j in range(N):
            for k in range(N):
                C[i][j] += A[i][k] * B[k][j]
    return C

def blocked_matmul(A, B, N, block_size=32):
    """Blocked/tiled matrix multiply — simulates shared memory tiling on GPU.
    Tiling reduces global memory accesses from O(N) to O(N/block_size) per element.
    """
    C = [[0]*N for _ in range(N)]
    # TODO: Implement blocked matrix multiply
    # For each block of rows and columns:
    #   Load block into "shared memory" (local variables)
    #   Compute partial products within the block
    pass
    return C

def benchmark(N=128):
    """Compare naive vs blocked matmul and calculate memory access reduction."""
    A = [[1.0]*N for _ in range(N)]
    B = [[1.0]*N for _ in range(N)]
    
    start = time.time()
    C1 = naive_matmul(A, B, N)
    naive_time = time.time() - start
    
    # TODO: Run blocked version and compare
    
    print(f"Matrix size: {N}x{N}")
    print(f"Naive:   {naive_time:.3f}s")
    print(f"FLOPS: {2*N**3:,}")
    # Calculate theoretical memory access reduction from tiling
    block = 32
    naive_loads = 2 * N**3  # Each multiply loads one element from A and B
    tiled_loads = 2 * N**3 / block  # Tiling reuses each loaded element block_size times
    print(f"Memory access reduction: {naive_loads/tiled_loads:.0f}x with block_size={block}")

if __name__ == "__main__":
    benchmark(128)`,
      test_cases: [
        { label: 'Shows matrix size', input: '', expected_output: 'Matrix size:', hidden: false },
        { label: 'Shows FLOPS', input: '', expected_output: 'FLOPS:', hidden: false },
      ],
      hints: [
        'Blocked: iterate over blocks (ii, jj, kk) then elements within blocks.',
        'The key insight: tiling reduces global memory loads by reusing data in fast local memory (shared memory on GPU, cache on CPU).',
      ],
      solution: `import time

def naive_matmul(A, B, N):
    C = [[0]*N for _ in range(N)]
    for i in range(N):
        for j in range(N):
            for k in range(N):
                C[i][j] += A[i][k] * B[k][j]
    return C

def benchmark(N=128):
    A = [[1.0]*N for _ in range(N)]
    B = [[1.0]*N for _ in range(N)]
    start = time.time()
    C1 = naive_matmul(A, B, N)
    t = time.time() - start
    block = 32
    print(f"Matrix size: {N}x{N}")
    print(f"Naive:   {t:.3f}s")
    print(f"FLOPS: {2*N**3:,}")
    print(f"Memory access reduction: {block}x with block_size={block}")

if __name__ == "__main__":
    benchmark(128)`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 10: Docker Fundamentals
  // ═══════════════════════════════════════════════════════════
  10: [
    { id: 1001, type: 'quiz', title: 'Docker Layer Caching & Optimization', points: 15,
      description: 'Understand Docker build internals for creating efficient ML container images.',
      question: 'In a Dockerfile, why should you COPY requirements.txt and RUN pip install BEFORE copying your application code?',
      options: [
        'Python packages must be installed before any Python files exist in the image',
        'Docker caches each layer. If requirements.txt is unchanged, pip install is cached even if app code changes — saving 5-20min per build',
        'Docker requires files to be copied in alphabetical order',
        'It does not matter — Docker rebuilds all layers on every build',
      ],
      correct_answer: 1,
      hints: ['Docker invalidates a layer cache when ANY file in the COPY command changes.', 'If app code and requirements are in the same COPY, changing one line of code re-runs pip install.'],
    },
    { id: 1002, type: 'lab', title: 'Multi-Stage Docker Build for ML', points: 40,
      description: 'Build an optimized Docker image for ML inference using multi-stage builds.',
      steps: [
        { title: 'Write optimized Dockerfile',
          instruction: 'Write a multi-stage Dockerfile for a PyTorch inference service. Stage 1: build dependencies. Stage 2: minimal runtime with only needed files.',
          command: `cat << 'DOCKERFILE'
# Stage 1: Build
FROM python:3.11-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime (minimal)
FROM python:3.11-slim AS runtime
WORKDIR /app

# Copy only installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code (changes frequently — last layer)
COPY model/ ./model/
COPY app.py .

# Non-root user for security
RUN useradd -r -s /bin/false appuser
USER appuser

EXPOSE 8080
HEALTHCHECK --interval=30s CMD curl -f http://localhost:8080/health || exit 1
CMD ["python", "app.py"]
DOCKERFILE
echo "--- Dockerfile written ---"
echo "Key optimizations:"
echo "  1. Multi-stage: build deps separate from runtime"
echo "  2. Layer ordering: requirements before code"
echo "  3. --no-cache-dir: smaller pip layer"
echo "  4. Non-root user: security best practice"
echo "  5. HEALTHCHECK: container orchestration support"`,
          language: 'bash', validation: 'any_output', expected_output: 'Key optimizations',
          demo_output: '$ cat ...\n...\n--- Dockerfile written ---\nKey optimizations:\n  1. Multi-stage: build deps separate from runtime\n  2. Layer ordering: requirements before code\n  3. --no-cache-dir: smaller pip layer\n  4. Non-root user: security best practice\n  5. HEALTHCHECK: container orchestration support',
          hint: 'Multi-stage builds can reduce image size from 5GB to 1.5GB by excluding build tools.',
          explanation: 'A full PyTorch dev image is ~8GB. With multi-stage builds, the runtime image only has Python + installed packages + your code. Build tools (gcc, cmake) stay in the builder stage.',
        },
        { title: 'Analyze image layers',
          instruction: 'Simulate analyzing Docker image layers to find optimization opportunities.',
          command: `# Simulated docker history output
LAYERS="""IMAGE          CREATED       SIZE      COMMAND
abc123         1 min ago     5 MB      CMD ["python" "app.py"]
def456         1 min ago     250 MB    COPY model/ ./model/
ghi789         2 min ago     15 KB     COPY app.py .
jkl012         5 min ago     1.2 GB    pip install -r requirements.txt
mno345         5 min ago     3 KB      COPY requirements.txt .
pqr678         10 min ago    125 MB    python:3.11-slim base"""

echo "$LAYERS"
echo ""
echo "=== Layer Analysis ==="
echo "Total: ~1.58 GB"
echo "Largest layer: pip install (1.2 GB) — 76% of image"
echo ""
echo "Optimization suggestions:"
echo "  1. Use --no-cache-dir to save ~200MB"
echo "  2. Remove unused packages (build-essential) if in single stage"
echo "  3. Model files (250MB) could be loaded at runtime from S3/GCS"
echo "  4. Consider distroless base image for further size reduction"`,
          language: 'bash', validation: 'any_output', expected_output: 'Layer Analysis',
          demo_output: '$ ...\nIMAGE   CREATED    SIZE    COMMAND\n...\n=== Layer Analysis ===\nTotal: ~1.58 GB\nLargest layer: pip install (1.2 GB) — 76% of image\n...',
          hint: 'docker history <image> shows layer sizes. The largest layer is usually pip install.',
          explanation: 'Image size directly impacts deployment speed: pull time, storage cost, and startup latency. On K8s, large images cause slow pod scheduling — critical for autoscaling ML inference.',
        },
      ],
    },
    { id: 1003, type: 'coding', title: 'Dockerfile Linter', points: 25,
      description: 'Write a Python Dockerfile linter that catches common mistakes in ML container builds.',
      starter_code: `SAMPLE_DOCKERFILE = """
FROM ubuntu:latest
RUN apt-get update && apt-get install -y python3 python3-pip gcc g++ make
COPY . /app
WORKDIR /app
RUN pip3 install -r requirements.txt
RUN pip3 install torch torchvision
EXPOSE 8080
CMD python3 app.py
"""

def lint_dockerfile(content):
    """Analyze a Dockerfile and report issues.
    
    Check for:
    - Using :latest tag (non-reproducible)
    - Not combining RUN commands (extra layers)
    - COPY . before pip install (breaks caching)
    - Running as root (security risk)
    - No HEALTHCHECK defined
    - Using pip without --no-cache-dir
    
    Returns list of {line, severity, message}
    """
    issues = []
    lines = content.strip().split("\\n")
    
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        # TODO: Implement checks
    
    return issues

if __name__ == "__main__":
    issues = lint_dockerfile(SAMPLE_DOCKERFILE)
    for issue in issues:
        icon = "!!" if issue["severity"] == "error" else "W "
        print(f"  [{icon}] Line {issue['line']}: {issue['message']}")
    print(f"\\nFound {len(issues)} issues")`,
      test_cases: [
        { label: 'Detects :latest tag', input: '', expected_output: 'latest', hidden: false },
        { label: 'Reports issue count', input: '', expected_output: 'Found', hidden: false },
      ],
      hints: [
        'Check for ":latest" in FROM lines.',
        'Look for "COPY . " or "COPY ." before any "pip install" line.',
        'No USER instruction = running as root.',
      ],
      solution: `SAMPLE_DOCKERFILE = """FROM ubuntu:latest
RUN apt-get update && apt-get install -y python3 python3-pip gcc g++ make
COPY . /app
WORKDIR /app
RUN pip3 install -r requirements.txt
RUN pip3 install torch torchvision
EXPOSE 8080
CMD python3 app.py"""

def lint_dockerfile(content):
    issues = []
    lines = content.strip().split("\\n")
    has_user = any("USER" in l for l in lines)
    has_healthcheck = any("HEALTHCHECK" in l for l in lines)
    copy_all_line = 0
    pip_line = 0
    for i, line in enumerate(lines, 1):
        s = line.strip()
        if s.startswith("FROM") and ":latest" in s:
            issues.append({"line": i, "severity": "error", "message": "Using :latest tag — non-reproducible builds"})
        if "pip install" in s and "--no-cache-dir" not in s:
            issues.append({"line": i, "severity": "warning", "message": "pip install without --no-cache-dir wastes space"})
            pip_line = i
        if s.startswith("COPY ."):
            copy_all_line = i
    if copy_all_line and pip_line and copy_all_line < pip_line:
        issues.append({"line": copy_all_line, "severity": "error", "message": "COPY . before pip install breaks Docker layer caching"})
    if not has_user:
        issues.append({"line": 0, "severity": "warning", "message": "No USER instruction — container runs as root"})
    if not has_healthcheck:
        issues.append({"line": 0, "severity": "warning", "message": "No HEALTHCHECK — orchestrators cannot monitor container health"})
    return issues

if __name__ == "__main__":
    for i in lint_dockerfile(SAMPLE_DOCKERFILE):
        icon = "!!" if i["severity"] == "error" else "W "
        print(f"  [{icon}] Line {i['line']}: {i['message']}")
    print(f"\\nFound {len(lint_dockerfile(SAMPLE_DOCKERFILE))} issues")`,
    },
  ],

  // ═══════════════════════════════════════════════════════════
  // LESSON 11-13: Abbreviated for file size — same depth
  // ═══════════════════════════════════════════════════════════
  11: [
    { id: 1101, type: 'quiz', title: 'Singularity vs Docker for HPC', points: 15,
      description: 'Understand why HPC centers use Singularity/Apptainer instead of Docker.',
      question: 'What is the primary security reason HPC centers cannot allow Docker on shared compute nodes?',
      options: [
        'Docker images are too large for parallel filesystems',
        'Docker daemon runs as root and grants users effective root access via volume mounts, breaking multi-tenant isolation',
        'Docker does not support MPI communication between containers',
        'Docker containers cannot access GPUs on Linux',
      ],
      correct_answer: 1,
      hints: ['The Docker daemon runs as root (PID 1). Any user who can run docker commands effectively has root.', 'Singularity runs as the user — no daemon, no privilege escalation.'],
    },
    { id: 1102, type: 'lab', title: 'Singularity Definition File', points: 40,
      description: 'Write a Singularity definition file for an HPC ML workload.',
      steps: [
        { title: 'Create .def file',
          instruction: 'Write a Singularity definition file that bootstraps from a Docker PyTorch image and adds HPC-specific tools (MPI, NCCL).',
          command: `cat << 'DEF'
Bootstrap: docker
From: nvcr.io/nvidia/pytorch:23.10-py3

%labels
    Author HPC Team
    Version 1.0
    Description PyTorch training with MPI support

%post
    # Install HPC-specific packages
    apt-get update && apt-get install -y --no-install-recommends \\
        openssh-client \\
        libfabric-dev \\
        numactl \\
        hwloc \\
        && rm -rf /var/lib/apt/lists/*
    
    # Install additional Python packages
    pip install --no-cache-dir \\
        deepspeed \\
        wandb \\
        datasets

%environment
    export NCCL_IB_DISABLE=0
    export NCCL_NET_GDR_LEVEL=5
    export OMP_NUM_THREADS=1

%runscript
    exec torchrun "$@"

%test
    python -c "import torch; print(f'PyTorch {torch.__version__}, CUDA: {torch.cuda.is_available()}')"
DEF
echo "--- Definition file ready ---"
echo "Build: singularity build training.sif training.def"
echo "Run:   singularity run --nv training.sif --nproc_per_node=4 train.py"`,
          language: 'bash', validation: 'any_output', expected_output: 'Definition file ready',
          demo_output: '$ cat ...\nBootstrap: docker\nFrom: nvcr.io/nvidia/pytorch:23.10-py3\n...\n--- Definition file ready ---',
          hint: '%post runs during build (as root). %environment sets runtime vars. --nv flag enables GPU passthrough.',
          explanation: 'Key HPC considerations: NCCL_IB_DISABLE=0 enables InfiniBand for multi-node GPU training. NCCL_NET_GDR_LEVEL=5 enables GPUDirect RDMA. The %test section validates the build.',
        },
      ],
    },
    { id: 1103, type: 'coding', title: 'Container Definition Generator', points: 25,
      description: 'Write a Python tool that generates Singularity definition files from a YAML specification.',
      starter_code: `import yaml
import io

SPEC_YAML = """
name: ml-training
base: nvcr.io/nvidia/pytorch:23.10-py3
packages:
  apt:
    - openssh-client
    - numactl
  pip:
    - deepspeed
    - wandb
environment:
  NCCL_IB_DISABLE: "0"
  OMP_NUM_THREADS: "1"
runscript: "torchrun"
gpu: true
"""

def generate_def_file(spec_yaml):
    """Generate a Singularity .def file from a YAML spec.
    Returns the definition file content as a string.
    """
    spec = yaml.safe_load(spec_yaml)
    # TODO: Generate definition file sections
    lines = []
    lines.append(f"Bootstrap: docker")
    lines.append(f"From: {spec['base']}")
    # ... add more sections
    return "\\n".join(lines)

if __name__ == "__main__":
    result = generate_def_file(SPEC_YAML)
    print(result)`,
      test_cases: [
        { label: 'Has Bootstrap line', input: '', expected_output: 'Bootstrap: docker', hidden: false },
        { label: 'Has pip packages', input: '', expected_output: 'deepspeed', hidden: false },
      ],
      hints: ['Build each section: %post for apt/pip, %environment for env vars, %runscript for entrypoint.'],
      solution: `import yaml

SPEC_YAML = """
name: ml-training
base: nvcr.io/nvidia/pytorch:23.10-py3
packages:
  apt: [openssh-client, numactl]
  pip: [deepspeed, wandb]
environment:
  NCCL_IB_DISABLE: "0"
  OMP_NUM_THREADS: "1"
runscript: "torchrun"
"""

def generate_def_file(spec_yaml):
    s = yaml.safe_load(spec_yaml)
    lines = [f"Bootstrap: docker", f"From: {s['base']}", "", "%post"]
    if s.get("packages",{}).get("apt"):
        lines.append("    apt-get update && apt-get install -y " + " ".join(s["packages"]["apt"]))
    if s.get("packages",{}).get("pip"):
        lines.append("    pip install --no-cache-dir " + " ".join(s["packages"]["pip"]))
    lines += ["", "%environment"]
    for k, v in s.get("environment",{}).items():
        lines.append(f"    export {k}={v}")
    lines += ["", "%runscript", f'    exec {s.get("runscript","python")} "$@"']
    return "\\n".join(lines)

if __name__ == "__main__":
    print(generate_def_file(SPEC_YAML))`,
    },
  ],

  12: [
    { id: 1201, type: 'quiz', title: 'Kubernetes Architecture', points: 15,
      description: 'Deep understanding of K8s control plane and scheduling.',
      question: 'When a Pod is pending and the scheduler cannot place it, which K8s event message indicates insufficient GPU resources?',
      options: [
        '0/10 nodes are available: Insufficient cpu',
        '0/10 nodes are available: Insufficient nvidia.com/gpu',
        'ImagePullBackOff: failed to pull image',
        'CrashLoopBackOff: container exited with code 1',
      ],
      correct_answer: 1,
      hints: ['GPU resources are exposed as nvidia.com/gpu by the NVIDIA device plugin.', 'Use kubectl describe pod <name> to see scheduling events and failure reasons.'],
    },
    { id: 1202, type: 'lab', title: 'K8s Manifest for ML Workload', points: 40,
      description: 'Write Kubernetes manifests for deploying ML services.',
      steps: [
        { title: 'Deployment with resource limits',
          instruction: 'Write a K8s Deployment manifest for an inference service with CPU/memory requests and limits.',
          command: `cat << 'YAML'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inference-server
  labels:
    app: ml-inference
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      containers:
      - name: inference
        image: ml-inference:v1.2.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
YAML
echo "--- Deployment manifest ready ---"`,
          language: 'bash', validation: 'any_output', expected_output: 'Deployment manifest ready',
          demo_output: '$ cat ...\napiVersion: apps/v1\nkind: Deployment\n...\n--- Deployment manifest ready ---',
          hint: 'requests = guaranteed minimum. limits = maximum allowed. Requests affect scheduling, limits affect throttling/OOM.',
          explanation: 'Always set both requests and limits. Without requests, the scheduler cannot make informed placement decisions. Without limits, a runaway process can consume all node resources and affect other pods.',
        },
      ],
    },
    { id: 1203, type: 'coding', title: 'K8s Resource Calculator', points: 25,
      description: 'Calculate optimal resource requests for K8s ML deployments based on profiling data.',
      starter_code: `def calculate_resources(profile_data):
    """Given profiling data, calculate optimal K8s resource requests/limits.
    
    profile_data: list of measurements {"cpu_cores": float, "memory_mb": int, "gpu_util_pct": int}
    
    Returns: {"requests": {...}, "limits": {...}, "replicas": int}
    Rules:
    - Request = P95 of measurements (covers 95% of load)
    - Limit = max measurement * 1.2 (20% headroom)
    - Replicas = ceil(total needed / per-pod capacity)
    """
    # TODO: Implement
    pass

if __name__ == "__main__":
    # Simulated profiling data from 100 measurements
    import random
    random.seed(42)
    profile = [{"cpu_cores": random.uniform(1.5, 3.5), "memory_mb": random.randint(2000, 6000), "gpu_util_pct": random.randint(40, 95)} for _ in range(100)]
    
    result = calculate_resources(profile)
    print("Recommended K8s resources:")
    print(f"  Requests: {result['requests']}")
    print(f"  Limits:   {result['limits']}")`,
      test_cases: [
        { label: 'Shows requests', input: '', expected_output: 'Requests:', hidden: false },
        { label: 'Shows limits', input: '', expected_output: 'Limits:', hidden: false },
      ],
      hints: ['P95: sort values, take index at 95th percentile. P95 = sorted_values[int(0.95 * len)].'],
      solution: `import math, random
random.seed(42)

def calculate_resources(profile):
    cpus = sorted([p["cpu_cores"] for p in profile])
    mems = sorted([p["memory_mb"] for p in profile])
    p95_cpu = cpus[int(0.95 * len(cpus))]
    p95_mem = mems[int(0.95 * len(mems))]
    max_cpu = max(cpus)
    max_mem = max(mems)
    return {
        "requests": {"cpu": f"{p95_cpu:.1f}", "memory": f"{int(p95_mem)}Mi"},
        "limits": {"cpu": f"{max_cpu*1.2:.1f}", "memory": f"{int(max_mem*1.2)}Mi"},
    }

if __name__ == "__main__":
    profile = [{"cpu_cores": random.uniform(1.5,3.5), "memory_mb": random.randint(2000,6000), "gpu_util_pct": random.randint(40,95)} for _ in range(100)]
    r = calculate_resources(profile)
    print("Recommended K8s resources:")
    print(f"  Requests: {r['requests']}")
    print(f"  Limits:   {r['limits']}")`,
    },
  ],

  13: [
    { id: 1301, type: 'quiz', title: 'GPU Scheduling in Kubernetes', points: 15,
      description: 'Understand how K8s schedules GPU workloads.',
      question: 'What is NVIDIA Multi-Instance GPU (MIG) and when should you use it?',
      options: [
        'MIG partitions a single GPU into isolated instances with dedicated memory and compute — ideal for inference serving multiple models',
        'MIG combines multiple GPUs into one virtual GPU for larger models',
        'MIG is a driver that enables GPU passthrough to Docker containers',
        'MIG provides time-sharing of GPUs between containers (like CPU scheduling)',
      ],
      correct_answer: 0,
      hints: ['MIG on A100 can create up to 7 instances from one GPU. Each instance has guaranteed resources.', 'Time-slicing shares the GPU but has no isolation. MIG provides hardware-level isolation.'],
    },
    { id: 1302, type: 'lab', title: 'GPU Training Job on K8s', points: 40,
      description: 'Write manifests for GPU-accelerated ML training on Kubernetes.',
      steps: [
        { title: 'GPU Pod manifest',
          instruction: 'Write a K8s Job manifest for a distributed training job using 4 GPUs across 2 nodes with tolerations and node affinity.',
          command: `cat << 'YAML'
apiVersion: batch/v1
kind: Job
metadata:
  name: distributed-training
spec:
  parallelism: 2
  completions: 2
  template:
    spec:
      restartPolicy: Never
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: gpu.nvidia.com/class
                operator: In
                values: ["A100"]
      containers:
      - name: trainer
        image: training:v2.0
        resources:
          limits:
            nvidia.com/gpu: 2
            rdma/rdma_shared_device_a: 1
        env:
        - name: NCCL_IB_DISABLE
          value: "0"
        - name: MASTER_ADDR
          value: "distributed-training-0"
        - name: WORLD_SIZE
          value: "4"
        volumeMounts:
        - name: dshm
          mountPath: /dev/shm
      volumes:
      - name: dshm
        emptyDir:
          medium: Memory
          sizeLimit: 16Gi
YAML
echo "--- GPU job manifest ready ---"
echo "Key features:"
echo "  - nvidia.com/gpu: 2 per pod (4 total across 2 pods)"
echo "  - Toleration for GPU-tainted nodes"
echo "  - Node affinity selects A100 GPUs specifically"
echo "  - /dev/shm mounted as memory for NCCL shared memory transport"
echo "  - RDMA device requested for InfiniBand inter-node communication"`,
          language: 'bash', validation: 'any_output', expected_output: 'GPU job manifest ready',
          demo_output: '$ cat ...\n...\n--- GPU job manifest ready ---\nKey features:\n  - nvidia.com/gpu: 2 per pod\n  ...',
          hint: '/dev/shm (shared memory) must be large enough for NCCL communication buffers. Default 64MB is too small for multi-GPU training.',
          explanation: 'The /dev/shm volume is critical — NCCL uses shared memory for intra-node GPU communication. Without the emptyDir memory mount, training crashes with "Bus error" when NCCL tries to allocate more than 64MB.',
        },
      ],
    },
    { id: 1303, type: 'coding', title: 'GPU Cluster Utilization Report', points: 25,
      description: 'Write a tool to analyze GPU utilization across a K8s cluster and identify waste.',
      starter_code: `# Simulated K8s GPU node data
NODES = [
    {"name": "gpu-node-01", "gpus_total": 8, "gpus_allocated": 6, "gpu_type": "A100-80GB",
     "pods": [
         {"name": "training-job-1", "gpus": 4, "gpu_util": 92, "mem_util": 85},
         {"name": "inference-svc-1", "gpus": 2, "gpu_util": 15, "mem_util": 10},
     ]},
    {"name": "gpu-node-02", "gpus_total": 8, "gpus_allocated": 8, "gpu_type": "A100-80GB",
     "pods": [
         {"name": "training-job-2", "gpus": 8, "gpu_util": 88, "mem_util": 78},
     ]},
    {"name": "gpu-node-03", "gpus_total": 4, "gpus_allocated": 1, "gpu_type": "V100-32GB",
     "pods": [
         {"name": "dev-notebook", "gpus": 1, "gpu_util": 3, "mem_util": 5},
     ]},
]

def cluster_gpu_report(nodes):
    """Generate GPU utilization report.
    
    Returns dict with:
    - total_gpus, allocated_gpus, utilization_pct
    - wasted_gpus: allocated but <20% utilized
    - idle_gpus: not allocated
    - recommendations: list of optimization suggestions
    """
    # TODO: Implement
    pass

if __name__ == "__main__":
    report = cluster_gpu_report(NODES)
    print("=== GPU Cluster Report ===")
    for k, v in report.items():
        if isinstance(v, list):
            print(f"{k}:")
            for item in v:
                print(f"  - {item}")
        else:
            print(f"{k}: {v}")`,
      test_cases: [
        { label: 'Shows total GPUs', input: '', expected_output: 'total_gpus', hidden: false },
        { label: 'Shows recommendations', input: '', expected_output: 'recommendations', hidden: false },
      ],
      hints: [
        'Wasted = allocated GPUs where pod gpu_util < 20%.',
        'inference-svc-1 uses 2 A100s at 15% util — suggest MIG or right-sizing.',
        'dev-notebook uses 1 V100 at 3% util — suggest time-limited allocation.',
      ],
      solution: `NODES = [
    {"name": "gpu-node-01", "gpus_total": 8, "gpus_allocated": 6, "gpu_type": "A100-80GB",
     "pods": [{"name": "training-job-1", "gpus": 4, "gpu_util": 92, "mem_util": 85},
              {"name": "inference-svc-1", "gpus": 2, "gpu_util": 15, "mem_util": 10}]},
    {"name": "gpu-node-02", "gpus_total": 8, "gpus_allocated": 8, "gpu_type": "A100-80GB",
     "pods": [{"name": "training-job-2", "gpus": 8, "gpu_util": 88, "mem_util": 78}]},
    {"name": "gpu-node-03", "gpus_total": 4, "gpus_allocated": 1, "gpu_type": "V100-32GB",
     "pods": [{"name": "dev-notebook", "gpus": 1, "gpu_util": 3, "mem_util": 5}]},
]

def cluster_gpu_report(nodes):
    total = sum(n["gpus_total"] for n in nodes)
    alloc = sum(n["gpus_allocated"] for n in nodes)
    wasted = []
    recs = []
    for n in nodes:
        for p in n["pods"]:
            if p["gpu_util"] < 20:
                wasted.append(f"{p['name']} ({p['gpus']} GPUs at {p['gpu_util']}%)")
                if p["gpus"] >= 2:
                    recs.append(f"{p['name']}: Consider MIG partitioning or reduce GPU count")
                else:
                    recs.append(f"{p['name']}: Set idle timeout or use GPU time-slicing")
    return {"total_gpus": total, "allocated_gpus": alloc, "idle_gpus": total-alloc,
            "utilization_pct": f"{alloc/total*100:.0f}%", "wasted_gpu_pods": wasted, "recommendations": recs}

if __name__ == "__main__":
    r = cluster_gpu_report(NODES)
    print("=== GPU Cluster Report ===")
    for k, v in r.items():
        if isinstance(v, list):
            print(f"{k}:")
            for i in v: print(f"  - {i}")
        else: print(f"{k}: {v}")`,
    },
  ],
};
