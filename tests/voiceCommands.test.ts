import { describe, it, expect } from 'vitest';
import { parseVoiceCommand } from '../hooks/useVoiceCommands';

describe('Voice Commands Multilingual Parser', () => {
    describe('English (en-US)', () => {
        it('should recognize describe commands', () => {
            expect(parseVoiceCommand('Please describe the scene', 'en-US')).toBe('describe');
            expect(parseVoiceCommand('What do you see here?', 'en-US')).toBe('describe');
        });

        it('should recognize read text commands', () => {
            expect(parseVoiceCommand('Read this text', 'en-US')).toBe('read');
            expect(parseVoiceCommand('Perform OCR on document', 'en-US')).toBe('read');
        });

        it('should recognize capture commands', () => {
            expect(parseVoiceCommand('Capture photo', 'en-US')).toBe('capture');
            expect(parseVoiceCommand('Take a picture', 'en-US')).toBe('capture');
            expect(parseVoiceCommand('Click photo', 'en-US')).toBe('capture');
        });

        it('should recognize stop commands', () => {
            expect(parseVoiceCommand('Stop speech', 'en-US')).toBe('stop');
            expect(parseVoiceCommand('Silence please', 'en-US')).toBe('stop');
        });

        it('should recognize repeat commands', () => {
            expect(parseVoiceCommand('Repeat that', 'en-US')).toBe('repeat');
            expect(parseVoiceCommand('Read again', 'en-US')).toBe('repeat');
        });
    });

    describe('Hindi (hi-IN)', () => {
        it('should recognize localized Hindi commands', () => {
            expect(parseVoiceCommand('कमरे का दृश्य बताओ', 'hi-IN')).toBe('describe');
            expect(parseVoiceCommand('यह टेक्स्ट पढ़ो', 'hi-IN')).toBe('read');
            expect(parseVoiceCommand('तस्वीर खींचो', 'hi-IN')).toBe('capture');
            expect(parseVoiceCommand('रोको अब', 'hi-IN')).toBe('stop');
            expect(parseVoiceCommand('दोबारा दोहराओ', 'hi-IN')).toBe('repeat');
        });

        it('should allow English keywords as fallback in Hindi mode', () => {
            expect(parseVoiceCommand('capture photo', 'hi-IN')).toBe('capture');
            expect(parseVoiceCommand('stop', 'hi-IN')).toBe('stop');
        });
    });

    describe('Spanish (es-ES)', () => {
        it('should recognize localized Spanish commands', () => {
            expect(parseVoiceCommand('Describir la escena', 'es-ES')).toBe('describe');
            expect(parseVoiceCommand('Por favor leer este texto', 'es-ES')).toBe('read');
            expect(parseVoiceCommand('Capturar una foto', 'es-ES')).toBe('capture');
            expect(parseVoiceCommand('Parar la voz', 'es-ES')).toBe('stop');
            expect(parseVoiceCommand('Repetir otra vez', 'es-ES')).toBe('repeat');
        });
    });

    describe('French (fr-FR)', () => {
        it('should recognize localized French commands', () => {
            expect(parseVoiceCommand('Décrire la scène', 'fr-FR')).toBe('describe');
            expect(parseVoiceCommand('Lire le texte', 'fr-FR')).toBe('read');
            expect(parseVoiceCommand('Prendre une photo', 'fr-FR')).toBe('capture');
            expect(parseVoiceCommand('Arrêter la lecture', 'fr-FR')).toBe('stop');
            expect(parseVoiceCommand('Répéter encore', 'fr-FR')).toBe('repeat');
        });
    });

    describe('German (de-DE)', () => {
        it('should recognize localized German commands', () => {
            expect(parseVoiceCommand('Szene beschreiben bitte', 'de-DE')).toBe('describe');
            expect(parseVoiceCommand('Text vorlesen', 'de-DE')).toBe('read');
            expect(parseVoiceCommand('Foto aufnehmen', 'de-DE')).toBe('capture');
            expect(parseVoiceCommand('Stopp', 'de-DE')).toBe('stop');
            expect(parseVoiceCommand('Nochmal wiederholen', 'de-DE')).toBe('repeat');
        });
    });

    describe('Japanese (ja-JP)', () => {
        it('should recognize localized Japanese commands', () => {
            expect(parseVoiceCommand('シーンを説明して', 'ja-JP')).toBe('describe');
            expect(parseVoiceCommand('文字を読んで', 'ja-JP')).toBe('read');
            expect(parseVoiceCommand('写真撮影して', 'ja-JP')).toBe('capture');
            expect(parseVoiceCommand('ストップして', 'ja-JP')).toBe('stop');
            expect(parseVoiceCommand('もう一度繰り返して', 'ja-JP')).toBe('repeat');
        });
    });

    describe('Italian (it-IT)', () => {
        it('should recognize localized Italian commands', () => {
            expect(parseVoiceCommand('Descrivi la scena', 'it-IT')).toBe('describe');
            expect(parseVoiceCommand('Leggi questo testo', 'it-IT')).toBe('read');
            expect(parseVoiceCommand('Scatta una foto', 'it-IT')).toBe('capture');
            expect(parseVoiceCommand('Ferma', 'it-IT')).toBe('stop');
            expect(parseVoiceCommand('Ripeti di nuovo', 'it-IT')).toBe('repeat');
        });
    });

    describe('Portuguese (pt-BR)', () => {
        it('should recognize localized Portuguese commands', () => {
            expect(parseVoiceCommand('Descrever o ambiente', 'pt-BR')).toBe('describe');
            expect(parseVoiceCommand('Leia o texto', 'pt-BR')).toBe('read');
            expect(parseVoiceCommand('Tirar uma foto', 'pt-BR')).toBe('capture');
            expect(parseVoiceCommand('Pare o áudio', 'pt-BR')).toBe('stop');
            expect(parseVoiceCommand('Repetir de novo', 'pt-BR')).toBe('repeat');
        });
    });

    describe('Edge Cases', () => {
        it('should return null for empty string or unrecognized banter', () => {
            expect(parseVoiceCommand('', 'en-US')).toBeNull();
            expect(parseVoiceCommand('hello how is the weather today', 'en-US')).toBeNull();
        });
    });
});
