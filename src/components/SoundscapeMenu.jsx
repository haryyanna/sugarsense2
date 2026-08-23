import React, { useState, useEffect, useRef } from 'react';
import { Music, Music2, CloudRain, TreePine, Waves, Flame, Play, Pause, Volume2, X } from 'lucide-react';
import './SoundscapeMenu.css';

const SOUNDSCAPES = [
  { id: 'lofi', name: 'Lofi Focus', icon: <Music size={20} />, url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3' },
  { id: 'rain', name: 'Hujan Damai', icon: <CloudRain size={20} />, url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=heavy-rain-nature-sounds-8186.mp3' },
  { id: 'forest', name: 'Suasana Hutan', icon: <TreePine size={20} />, url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_0313c126d4.mp3?filename=forest-with-small-river-birds-and-nature-field-recording-6735.mp3' },
  { id: 'ocean', name: 'Ombak Pantai', icon: <Waves size={20} />, url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ocean-waves-112906.mp3' },
  { id: 'fire', name: 'Api Unggun', icon: <Flame size={20} />, url: 'https://cdn.pixabay.com/download/audio/2021/08/08/audio_651f8877bc.mp3?filename=crackling-fireplace-nature-sounds-8012.mp3' },
];

const SoundscapeMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSoundId, setActiveSoundId] = useState(SOUNDSCAPES[0].id);
  const [volume, setVolume] = useState(0.2); // Default to low volume
  
  const audioRef = useRef(null);
  
  useEffect(() => {
    // Initialize audio instance
    audioRef.current = new Audio();
    audioRef.current.loop = true;
    audioRef.current.volume = volume;
    
    return () => {
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      const selectedSound = SOUNDSCAPES.find(s => s.id === activeSoundId);
      if (selectedSound) {
        const wasPlaying = isPlaying;
        audioRef.current.pause();
        audioRef.current.src = selectedSound.url;
        audioRef.current.load();
        
        if (wasPlaying) {
          audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
      }
    }
  }, [activeSoundId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSoundSelect = (id) => {
    setActiveSoundId(id);
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  return (
    <div className="soundscape-container">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`soundscape-toggle ${isPlaying ? 'is-playing' : ''} hover-lift`}
        title="BGM & Suasana"
      >
        {isPlaying ? <Music size={20} /> : <Music2 size={20} />}
      </button>

      {/* Popover Menu */}
      <div className={`soundscape-popover ${isOpen ? 'show' : ''}`}>
        <div className="soundscape-header">
          <h4>Suasana & Musik</h4>
          <button onClick={() => setIsOpen(false)} className="soundscape-close">
            <X size={16} />
          </button>
        </div>

        <div className="soundscape-grid">
          {SOUNDSCAPES.map((sound) => (
            <button
              key={sound.id}
              onClick={() => handleSoundSelect(sound.id)}
              className={`soundscape-option ${activeSoundId === sound.id ? 'active' : ''}`}
            >
              <div className="soundscape-icon">{sound.icon}</div>
              <span>{sound.name}</span>
            </button>
          ))}
        </div>

        <div className="soundscape-controls">
          <button 
            onClick={togglePlay}
            className={`soundscape-play-btn ${isPlaying ? 'playing' : ''}`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          
          <div className="soundscape-volume">
            <Volume2 size={16} />
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="volume-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoundscapeMenu;
