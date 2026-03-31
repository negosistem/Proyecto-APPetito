let audioContext: AudioContext | null = null;

export function playNewOrderTone() {
    if (typeof window === 'undefined') {
        return;
    }

    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) {
        return;
    }

    try {
        audioContext ??= new AudioContextCtor();

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
            660,
            audioContext.currentTime + 0.16,
        );

        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.08,
            audioContext.currentTime + 0.02,
        );
        gainNode.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + 0.22,
        );

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.24);
    } catch {
        // Ignorar errores de audio, por ejemplo si el navegador bloquea autoplay.
    }
}
