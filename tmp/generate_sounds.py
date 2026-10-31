import numpy as np
import subprocess
import os

sample_rate = 44100
duration = 16.0  # 16 seconds seamless loop
t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)

# 1. Ocean Waves: rolling filtered surf with periodic swells
wave_period = 8.0
surf_envelope = (0.5 + 0.5 * np.sin(2 * np.pi * t / wave_period - np.pi/2)) ** 2
noise = np.random.normal(0, 1, len(t))
# Simple low-pass filtering for gentle surf roar
b_surf = np.convolve(noise, np.ones(80)/80, mode='same')
# Modulate with envelope
surf_audio = b_surf * (0.3 + 0.7 * surf_envelope)
# Gentle rumble tone
rumble = 0.2 * np.sin(2 * np.pi * 55 * t) * surf_envelope
ocean_signal = surf_audio + rumble
ocean_signal = ocean_signal / np.max(np.abs(ocean_signal) + 1e-6) * 0.75

# Smooth crossfade at loop boundary (0.5 sec)
cross_len = int(sample_rate * 0.5)
fade_in = np.linspace(0, 1, cross_len)
fade_out = np.linspace(1, 0, cross_len)
ocean_signal[:cross_len] = ocean_signal[:cross_len] * fade_in + ocean_signal[-cross_len:] * fade_out
ocean_signal[-cross_len:] = ocean_signal[:cross_len]

# 2. Tibetan Singing Bowl: 432 Hz fundamental + 528 Hz harmonic + rich calming overtones
bowl_fund = np.sin(2 * np.pi * 216 * t) * 0.4
bowl_432 = np.sin(2 * np.pi * 432 * t) * 0.35
bowl_528 = np.sin(2 * np.pi * 528 * t) * 0.25
bowl_harm = np.sin(2 * np.pi * 864 * t) * 0.1
# Soft breathing swell to sound alive
shimmer = 0.7 + 0.3 * np.sin(2 * np.pi * t / 4.0)
bowl_audio = (bowl_fund + bowl_432 + bowl_528 + bowl_harm) * shimmer
bowl_audio = bowl_audio / np.max(np.abs(bowl_audio) + 1e-6) * 0.7

# 3. Zen Mountain Breeze: soft pink-filtered soothing wind with subtle warmth
pink_noise = np.convolve(np.random.normal(0, 1, len(t)), np.ones(120)/120, mode='same')
wind_swell = 0.5 + 0.5 * np.sin(2 * np.pi * t / 6.0)
breeze_audio = pink_noise * (0.4 + 0.6 * wind_swell)
breeze_audio[:cross_len] = breeze_audio[:cross_len] * fade_in + breeze_audio[-cross_len:] * fade_out
breeze_audio[-cross_len:] = breeze_audio[:cross_len]
breeze_audio = breeze_audio / np.max(np.abs(breeze_audio) + 1e-6) * 0.7

def export_mp3(signal, filename):
    wav_path = f"/tmp/{filename}.wav"
    mp3_path = f"assets/Sounds/{filename}.mp3"
    int16_data = (signal * 32767).astype(np.int16)
    
    import wave
    with wave.open(wav_path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int16_data.tobytes())
    
    subprocess.run(["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-qscale:a", "2", mp3_path], check=True)
    if os.path.exists(wav_path):
        os.remove(wav_path)
    print(f"Exported {mp3_path}")

export_mp3(ocean_signal, "ocean_waves")
export_mp3(bowl_audio, "tibetan_bowl")
export_mp3(breeze_audio, "zen_wind")
