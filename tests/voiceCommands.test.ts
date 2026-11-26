import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceCommand } from '../hooks/useVoiceCommands';

describe('Voice Commands Multilingual Parser', () => {
    describe('English (en-US)', () => {
        it('should recognize describe commands', () => {
            assert.equal(parseVoiceCommand('Please describe the scene', 'en-US'), 'describe');
            assert.equal(parseVoiceCommand('What do you see here?', 'en-US'), 'describe');
        });

        it('should recognize read text commands', () => {
            assert.equal(parseVoiceCommand('Read this text', 'en-US'), 'read');
            assert.equal(parseVoiceCommand('Perform OCR on document', 'en-US'), 'read');
        });

        it('should recognize capture commands', () => {
            assert.equal(parseVoiceCommand('Capture photo', 'en-US'), 'capture');
            assert.equal(parseVoiceCommand('Take a picture', 'en-US'), 'capture');
            assert.equal(parseVoiceCommand('Click photo', 'en-US'), 'capture');
        });

        it('should recognize stop commands', () => {
            assert.equal(parseVoiceCommand('Stop speech', 'en-US'), 'stop');
            assert.equal(parseVoiceCommand('Silence please', 'en-US'), 'stop');
        });

        it('should recognize repeat commands', () => {
            assert.equal(parseVoiceCommand('Repeat that', 'en-US'), 'repeat');
            assert.equal(parseVoiceCommand('Read again', 'en-US'), 'repeat');
        });
    });

    describe('Hindi (hi-IN)', () => {
        it('should recognize localized Hindi commands', () => {
            assert.equal(parseVoiceCommand('कमरे का दृश्य बताओ', 'hi-IN'), 'describe');
            assert.equal(parseVoiceCommand('यह टेक्स्ट पढ़ो', 'hi-IN'), 'read');
            assert.equal(parseVoiceCommand('तस्वीर खींचो', 'hi-IN'), 'capture');
            assert.equal(parseVoiceCommand('रोको अब', 'hi-IN'), 'stop');
            assert.equal(parseVoiceCommand('दोबारा दोहराओ', 'hi-IN'), 'repeat');
        });

        it('should allow English keywords as fallback in Hindi mode', () => {
            assert.equal(parseVoiceCommand('capture photo', 'hi-IN'), 'capture');
            assert.equal(parseVoiceCommand('stop', 'hi-IN'), 'stop');
        });
    });

    describe('Spanish (es-ES)', () => {
        it('should recognize localized Spanish commands', () => {
            assert.equal(parseVoiceCommand('Describir la escena', 'es-ES'), 'describe');
            assert.equal(parseVoiceCommand('Por favor leer este texto', 'es-ES'), 'read');
            assert.equal(parseVoiceCommand('Capturar una foto', 'es-ES'), 'capture');
            assert.equal(parseVoiceCommand('Parar la voz', 'es-ES'), 'stop');
            assert.equal(parseVoiceCommand('Repetir otra vez', 'es-ES'), 'repeat');
        });
    });

    describe('French (fr-FR)', () => {
        it('should recognize localized French commands', () => {
            assert.equal(parseVoiceCommand('Décrire la scène', 'fr-FR'), 'describe');
            assert.equal(parseVoiceCommand('Lire le texte', 'fr-FR'), 'read');
            assert.equal(parseVoiceCommand('Prendre une photo', 'fr-FR'), 'capture');
            assert.equal(parseVoiceCommand('Arrêter la lecture', 'fr-FR'), 'stop');
            assert.equal(parseVoiceCommand('Répéter encore', 'fr-FR'), 'repeat');
        });
    });

    describe('German (de-DE)', () => {
        it('should recognize localized German commands', () => {
            assert.equal(parseVoiceCommand('Szene beschreiben bitte', 'de-DE'), 'describe');
            assert.equal(parseVoiceCommand('Text vorlesen', 'de-DE'), 'read');
            assert.equal(parseVoiceCommand('Foto aufnehmen', 'de-DE'), 'capture');
            assert.equal(parseVoiceCommand('Stopp', 'de-DE'), 'stop');
            assert.equal(parseVoiceCommand('Nochmal wiederholen', 'de-DE'), 'repeat');
        });
    });

    describe('Japanese (ja-JP)', () => {
        it('should recognize localized Japanese commands', () => {
            assert.equal(parseVoiceCommand('シーンを説明して', 'ja-JP'), 'describe');
            assert.equal(parseVoiceCommand('文字を読んで', 'ja-JP'), 'read');
            assert.equal(parseVoiceCommand('写真撮影して', 'ja-JP'), 'capture');
            assert.equal(parseVoiceCommand('ストップして', 'ja-JP'), 'stop');
            assert.equal(parseVoiceCommand('もう一度繰り返して', 'ja-JP'), 'repeat');
        });
    });

    describe('Italian (it-IT)', () => {
        it('should recognize localized Italian commands', () => {
            assert.equal(parseVoiceCommand('Descrivi la scena', 'it-IT'), 'describe');
            assert.equal(parseVoiceCommand('Leggi questo testo', 'it-IT'), 'read');
            assert.equal(parseVoiceCommand('Scatta una foto', 'it-IT'), 'capture');
            assert.equal(parseVoiceCommand('Ferma', 'it-IT'), 'stop');
            assert.equal(parseVoiceCommand('Ripeti di nuovo', 'it-IT'), 'repeat');
        });
    });

    describe('Portuguese (pt-BR)', () => {
        it('should recognize localized Portuguese commands', () => {
            assert.equal(parseVoiceCommand('Descrever o ambiente', 'pt-BR'), 'describe');
            assert.equal(parseVoiceCommand('Leia o texto', 'pt-BR'), 'read');
            assert.equal(parseVoiceCommand('Tirar uma foto', 'pt-BR'), 'capture');
            assert.equal(parseVoiceCommand('Pare o áudio', 'pt-BR'), 'stop');
            assert.equal(parseVoiceCommand('Repetir de novo', 'pt-BR'), 'repeat');
        });
    });

    describe('Edge Cases', () => {
        it('should return null for empty string or unrecognized banter', () => {
            assert.equal(parseVoiceCommand('', 'en-US'), null);
            assert.equal(parseVoiceCommand('hello how is the weather today', 'en-US'), null);
        });
    });
});
