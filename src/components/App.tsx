
import React, { useState, useRef, useEffect } from 'react';
import ParticleCanvas from './ParticleCanvas';

type ParticleShape = 'circle' | 'square' | 'triangle';

const App: React.FC = () => {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [musicSensitivity, setMusicSensitivity] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [particleShape, setParticleShape] = useState<ParticleShape>('circle');
  const [isHebrew, setIsHebrew] = useState(false);
  const [text, setText] = useState('HELLO');
  
  const [backgroundImage, setBackgroundImage] = useState('');
  const [musicUrl, setMusicUrl] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Effect to update background image when bgUrl state changes
  useEffect(() => {
      if (bgUrl) {
          setBackgroundImage(bgUrl);
      } else {
          setBackgroundImage('');
      }
  }, [bgUrl]);
  
  // Effect to change default text when Hebrew mode is toggled
  useEffect(() => {
    setText(isHebrew ? 'שלום' : 'HELLO');
  }, [isHebrew]);


  const setupAudioContext = () => {
    if (!audioContextRef.current) {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = context;
      
      const newAnalyser = context.createAnalyser();
      newAnalyser.fftSize = 256;
      setAnalyser(newAnalyser);
      
      if (audioRef.current) {
        const source = context.createMediaElementSource(audioRef.current);
        source.connect(newAnalyser);
        newAnalyser.connect(context.destination);
      }
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
  };

  const handleFileChange = (file: File, callback: (dataUrl: string) => void) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        callback(dataUrl);
    };
    reader.onerror = () => {
        alert("Could not read the file. Please try again.");
    };
    reader.readAsDataURL(file);
  };
  
  const handleAudioFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !audioRef.current) return;
    setupAudioContext();
    handleFileChange(file, (dataUrl) => {
        if (audioRef.current) {
            const audio = audioRef.current;
            
            const playWhenReady = () => {
                audio.play().catch(e => {
                    console.warn("Autoplay was prevented by the browser.", e);
                });
                audio.removeEventListener('canplay', playWhenReady);
            };
            audio.addEventListener('canplay', playWhenReady);

            audio.src = dataUrl;
            setMusicUrl(dataUrl);
        }
    });
  };

  const handleMusicUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setMusicUrl(url);
    if(audioRef.current) {
        audioRef.current.src = url;
    }
  }
  
  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileChange(file, (dataUrl) => {
        setBackgroundImage(dataUrl);
        setBgUrl(dataUrl);
    });
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };
  
  const handlePlayPauseClick = () => {
    setupAudioContext();
    if (!audioRef.current?.src || audioRef.current.src === window.location.href) { // Check if src is empty or just the base URL
      alert('Please provide a music URL or upload a local file first.');
    } else {
      togglePlayPause();
    }
  };

  const ShapeButton: React.FC<{shape: ParticleShape; currentShape: ParticleShape; setShape: (shape: ParticleShape) => void; children: React.ReactNode;}> = 
    ({ shape, currentShape, setShape, children }) => (
    <button
      onClick={() => setShape(shape)}
      className={`w-10 h-10 rounded-lg flex items-center justify-center text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        currentShape === shape ? 'bg-blue-500 focus:ring-blue-400' : 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500'
      }`}
      aria-label={`Set particle shape to ${shape}`}
    >
      {children}
    </button>
  );

  return (
    <main 
      className="relative w-screen h-screen overflow-hidden bg-black bg-cover bg-center transition-all duration-1000"
      style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}}
    >
      {audioError && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-11/12 max-w-lg p-6 bg-red-900 bg-opacity-90 backdrop-blur-sm rounded-xl shadow-2xl border border-red-600" role="alert">
            <h3 className="text-2xl font-bold text-white text-center mb-2">Oops! There's a problem.</h3>
            <p className="text-red-100 text-center">{audioError}</p>
            <button onClick={() => setAudioError(null)} className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-900">
                Dismiss
            </button>
        </div>
      )}

      <div className="absolute top-4 left-4 z-20 flex flex-col space-y-3 p-4 bg-gray-900 bg-opacity-80 backdrop-blur-sm rounded-xl shadow-lg w-[550px]">
        {/* Top row: Playback, sensitivity, shapes */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePlayPauseClick}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              isPlaying ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400' : 'bg-green-500 hover:bg-green-600 focus:ring-green-400'
            }`}
            aria-label={isPlaying ? 'Pause music' : 'Play music'}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <div className="flex items-center space-x-2">
              <label htmlFor="sensitivity-slider" className="text-white font-semibold text-sm">Sensitivity</label>
              <input id="sensitivity-slider" type="range" min="0.5" max="2.5" step="0.1" value={musicSensitivity} onChange={(e) => setMusicSensitivity(parseFloat(e.target.value))} className="w-24 cursor-pointer" />
          </div>
          <div className="h-10 w-px bg-gray-600"></div>
          <div className="flex items-center space-x-2">
            <ShapeButton shape="circle" currentShape={particleShape} setShape={setParticleShape}><svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Z" /></svg></ShapeButton>
            <ShapeButton shape="square" currentShape={particleShape} setShape={setParticleShape}><svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M3,3V21H21V3Z" /></svg></ShapeButton>
            <ShapeButton shape="triangle" currentShape={particleShape} setShape={setParticleShape}><svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M1,21H23L12,2Z" /></svg></ShapeButton>
          </div>
        </div>
        
          {/* Text Input & Hebrew Toggle */}
          <div className="flex items-center space-x-3">
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} maxLength={61} className="flex-grow bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center" placeholder="TYPE TEXT | USE | FOR NEW LINE" dir="auto" />
            <div className="flex items-center flex-shrink-0">
              <input 
                id="hebrew-checkbox" 
                type="checkbox" 
                checked={isHebrew} 
                onChange={(e) => setIsHebrew(e.target.checked)} 
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-offset-gray-900 focus:ring-2 cursor-pointer"
              />
              <label htmlFor="hebrew-checkbox" className="ml-2 text-sm font-medium text-gray-300 select-none cursor-pointer">Hebrew (RTL)</label>
            </div>
          </div>

        {/* URL Inputs */}
        <div className="w-full pt-3 mt-1 border-t border-gray-700 space-y-2">
            <input type="text" value={musicUrl.startsWith('data:') ? 'Local File Uploaded' : musicUrl} onChange={handleMusicUrlChange} readOnly={musicUrl.startsWith('data:')} className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder="Paste Music URL (.mp3, etc)..." />
            <input type="text" value={bgUrl.startsWith('data:') ? 'Local File Uploaded' : bgUrl} onChange={(e) => setBgUrl(e.target.value)} readOnly={bgUrl.startsWith('data:')} className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder="Paste Background Image URL..." />
        </div>
        
        {/* Local File Uploads Section */}
        <div className="w-full pt-3 mt-1 border-t border-gray-700 space-y-2">
            <div className="flex space-x-2">
              <button onClick={() => audioFileInputRef.current?.click()} className="w-full flex items-center justify-center px-4 py-2 font-semibold text-white bg-gray-700 rounded-lg shadow-md hover:bg-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l7-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm7-13c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 6l7-3" /></svg>
                  Upload Music
              </button>
              <button onClick={() => imageFileInputRef.current?.click()} className="w-full flex items-center justify-center px-4 py-2 font-semibold text-white bg-gray-700 rounded-lg shadow-md hover:bg-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                  Upload Image
              </button>
            </div>
            <input id="audio-upload" ref={audioFileInputRef} type="file" accept="audio/*" onChange={handleAudioFileChange} className="hidden" />
            <input id="image-upload" ref={imageFileInputRef} type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
        </div>
      </div>

      <audio 
        ref={audioRef} 
        crossOrigin="anonymous" 
        className="hidden"
        onPlay={() => { setIsPlaying(true); setAudioError(null); }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
            setIsPlaying(false);
            if(musicUrl) {
                if (musicUrl && musicUrl.startsWith('http')) {
                    setAudioError('Could not load the music file. The link might be incorrect or the server may not allow sharing (CORS policy). Please try a different direct, public link.');
                }
            }
        }}
      ></audio>
      <ParticleCanvas analyser={analyser} musicSensitivity={musicSensitivity} particleShape={particleShape} text={text} isHebrew={isHebrew} />
    </main>
  );
};

export default App;
