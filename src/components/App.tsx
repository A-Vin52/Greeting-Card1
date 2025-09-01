
import React, { useState, useRef, useEffect } from 'react';
import ParticleCanvas from './ParticleCanvas';

type ParticleShape = 'circle' | 'square' | 'triangle' | 'pomegranate';

const musicAssets = [
  { name: 'HB Hebrew', path: '/assets/music/HappyBirtday/HB_Hebrew.mp3' },
  { name: 'Shana Tova', path: '/assets/music/ShanaTova/ShanaTova2.mp3' },
];

const imageAssets = [
  { name: 'Cosmos 1', path: '/assets/images/Cosmos/Cosmos10.425Z.png' },
  { name: 'Cosmos 2', path: '/assets/images/Cosmos/Cosmos11.png' },
  { name: 'Cosmos 3', path: '/assets/images/Cosmos/Cosmos12.png' },
  { name: 'Cosmos 4', path: '/assets/images/Cosmos/Cosmos4.324Z.png' },
  { name: 'Cosmos 5', path: '/assets/images/Cosmos/Cosmos5.png' },
  { name: 'Cosmos 6', path: '/assets/images/Cosmos/Cosmos6.png' },
  { name: 'Cosmos 7', path: '/assets/images/Cosmos/Cosmos7.png' },
  { name: 'Cosmos 8', path: '/assets/images/Cosmos/Cosmos8.png' },
  { name: 'Cosmos 9', path: '/assets/images/Cosmos/Cosmos9.png' },
  { name: 'Seeds 1', path: '/assets/images/Seeds/Seeds1.png' },
  { name: 'Seeds 2', path: '/assets/images/Seeds/Seeds2.png' },
];

// Helper functions for UTF-8 safe Base64 encoding/decoding
const utf8ToBase64 = (str: string): string => {
  try {
    // First, we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which can be fed to btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      (match, p1) => String.fromCharCode(parseInt(p1, 16))
    ));
  } catch (e) {
    console.error("Failed to encode to Base64", e);
    return "";
  }
};

const base64ToUtf8 = (str: string): string => {
  try {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (e) {
    console.error("Failed to decode from Base64", e);
    return "";
  }
};

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
  const [isPresentationMode, setIsPresentationMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('text') || params.has('music') || params.has('image');
  });
  const [presentationDataLoaded, setPresentationDataLoaded] = useState(false);
  const [shareableLink, setShareableLink] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const textParam = params.get('text');
    const musicParam = params.get('music');
    const imageParam = params.get('image');
    const hebrewParam = params.get('hebrew');
    const shapeParam = params.get('shape') as ParticleShape;

    if (textParam || musicParam || imageParam) {
      setIsPresentationMode(true);
      if (textParam) {
        try {
          const decodedText = base64ToUtf8(textParam);
          setText(decodedText);
        } catch (e) {
          console.error("Failed to decode text from URL", e);
        }
      }
      if (musicParam) {
        const musicAsset = musicAssets.find(m => m.path.endsWith(musicParam));
        if (musicAsset) {
          setMusicUrl(musicAsset.path);
          if (audioRef.current) audioRef.current.src = musicAsset.path;
        }
      }
      if (imageParam) {
        const imageAsset = imageAssets.find(i => i.path.endsWith(imageParam));
        if (imageAsset) {
          setBackgroundImage(imageAsset.path);
          setBgUrl(imageAsset.path);
        }
      }
      if (hebrewParam) {
        setIsHebrew(hebrewParam === 'true');
      }
      if (shapeParam) {
        setParticleShape(shapeParam);
      }
      setPresentationDataLoaded(true);
    }
  }, []);

  // Effect to update background image when bgUrl state changes
  useEffect(() => {
      if (bgUrl) {
          setBackgroundImage(bgUrl);
      } else {
          setBackgroundImage('');
      }
  }, [bgUrl]);

  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.src = musicUrl;
    }
  }, [musicUrl]);
  
  // Effect to change default text when Hebrew mode is toggled
  useEffect(() => {
    if (!isPresentationMode) {
      setText(isHebrew ? 'שלום' : 'HELLO');
    }
  }, [isHebrew, isPresentationMode]);


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

  
  
  

  const handleMusicUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setMusicUrl(url);
    if(audioRef.current) {
        audioRef.current.src = url;
    }
  }
  
  

  const handlePlayPauseClick = () => {
    if (!audioContextRef.current) {
      setupAudioContext();
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        if (audioRef.current.src && audioRef.current.src !== window.location.href) {
          audioRef.current.play().catch(e => {
            console.error("Audio play failed", e);
            setAudioError("Could not play the audio. The file might be corrupt or in an unsupported format.");
          });
        } else {
          if (!isPresentationMode) {
            alert('Please provide a music URL or upload a local file first.');
          }
        }
      }
    }
  };

  const generateShareableLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set('text', utf8ToBase64(text));
    params.set('hebrew', isHebrew ? 'true' : 'false');
    params.set('shape', particleShape);
    if (musicUrl) {
      const musicFile = musicUrl.split('/').pop();
      if(musicFile) params.set('music', musicFile);
    }
    if (bgUrl) {
      const imageFile = bgUrl.split('/').pop();
      if(imageFile) params.set('image', imageFile);
    }
    setShareableLink(`${baseUrl}?${params.toString()}`);
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

  if (isPresentationMode) {
    return (
      <main 
        className="relative w-screen h-screen overflow-hidden bg-black bg-cover bg-center transition-all duration-1000"
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}}
      >

        <div className="absolute bottom-4 right-4 z-10">
          <button
            onClick={handlePlayPauseClick}
            className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500"
            aria-label={isPlaying ? 'Pause music' : 'Play music'}
          >
            {isPlaying ? 'Pause Music' : 'Play Music'}
          </button>
        </div>
        <audio 
          ref={audioRef} 
          crossOrigin="anonymous" 
          className="hidden"
          onPlay={() => { setIsPlaying(true); setAudioError(null); }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        ></audio>
        {presentationDataLoaded && 
          <ParticleCanvas analyser={analyser} musicSensitivity={musicSensitivity} particleShape={particleShape} text={text} isHebrew={isHebrew} />
        }
      </main>
    )
  }

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
            <ShapeButton shape="pomegranate" currentShape={particleShape} setShape={setParticleShape}><svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 15.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" /></svg></ShapeButton>
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

        {/* Asset Selection */}
        <div className="w-full pt-3 mt-1 border-t border-gray-700 space-y-2">
          <select onChange={(e) => { setMusicUrl(e.target.value); if(audioRef.current) audioRef.current.src = e.target.value; }} value={musicUrl} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Music</option>
            {musicAssets.map(asset => <option key={asset.path} value={asset.path}>{asset.name}</option>)}
          </select>
          <select onChange={(e) => setBgUrl(e.target.value)} value={bgUrl} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Image</option>
            {imageAssets.map(asset => <option key={asset.path} value={asset.path}>{asset.name}</option>)}
          </select>
        </div>

        {/* URL Inputs */}
        <div className="w-full pt-3 mt-1 border-t border-gray-700 space-y-2">
            <input type="text" value={musicUrl.startsWith('data:') ? 'Local File Uploaded' : musicUrl} onChange={handleMusicUrlChange} readOnly={musicUrl.startsWith('data:')} className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder="Paste Music URL (.mp3, etc)..." />
            <input type="text" value={bgUrl.startsWith('data:') ? 'Local File Uploaded' : bgUrl} onChange={(e) => setBgUrl(e.target.value)} readOnly={bgUrl.startsWith('data:')} className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" placeholder="Paste Background Image URL..." />
        </div>
        
        

        {/* Share Section */}
        <div className="w-full pt-3 mt-1 border-t border-gray-700 space-y-2">
          <button onClick={generateShareableLink} className="w-full flex items-center justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
            Generate Shareable Link
          </button>
          {shareableLink && (
            <div className="flex items-center space-x-2 pt-2">
              <input type="text" readOnly value={shareableLink} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4" />
              <button onClick={() => navigator.clipboard.writeText(shareableLink)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500">
                Copy
              </button>
            </div>
          )}
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
