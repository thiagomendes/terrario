import sys, glob, subprocess, numpy as np
SR=22050; out=[]
for p in sorted(glob.glob('/o/**/*.mp3', recursive=True)):
    x=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i',p,'-f','f32le','-'],capture_output=True).stdout,dtype=np.float32)
    w=int(0.02*SR); n=len(x)//w; e=20*np.log10(np.sqrt(np.mean(x[:n*w].reshape(n,w)**2,axis=1))+1e-9)
    on=np.where(e>e.max()-35)[0]
    if len(on)<2: continue
    gaps=np.diff(on)*0.02; g=gaps.max()
    if g>0.25: out.append((p[3:], round(float(g),2)))
print(len(out)); [print(o) for o in out]
