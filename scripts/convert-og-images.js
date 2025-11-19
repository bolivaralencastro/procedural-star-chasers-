#!/usr/bin/env node

/**
 * Script para converter imagens OG de PNG para WEBP
 * Necessário para compatibilidade com WhatsApp (requer formato WEBP)
 * 
 * Uso: node scripts/convert-og-images.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ogDir = path.join(__dirname, '../src/assets/og');

const images = [
  {
    input: 'og-image-facebook-1200x630.png',
    output: 'og-image-facebook-1200x630.webp',
    description: 'Facebook/WhatsApp (1200x630)'
  },
  {
    input: 'og-image-linkedin-1200x627.png',
    output: 'og-image-linkedin-1200x627.webp',
    description: 'LinkedIn (1200x627)'
  },
  {
    input: 'og-image-pinterest-1000x1500.png',
    output: 'og-image-pinterest-1000x1500.webp',
    description: 'Pinterest (1000x1500)'
  },
  {
    input: 'og-image-twitter-1024x512.png',
    output: 'og-image-twitter-1024x512.webp',
    description: 'Twitter (1024x512)'
  }
];

async function convertImages() {
  console.log('🚀 Iniciando conversão de imagens OG para WEBP...\n');

  for (const image of images) {
    const inputPath = path.join(ogDir, image.input);
    const outputPath = path.join(ogDir, image.output);

    if (!fs.existsSync(inputPath)) {
      console.log(`❌ Arquivo não encontrado: ${image.input}`);
      continue;
    }

    try {
      await sharp(inputPath)
        .webp({ quality: 80 })
        .toFile(outputPath);

      const inputSize = fs.statSync(inputPath).size / 1024;
      const outputSize = fs.statSync(outputPath).size / 1024;
      const reduction = ((1 - outputSize / inputSize) * 100).toFixed(2);

      console.log(`✅ ${image.description}`);
      console.log(`   PNG: ${inputSize.toFixed(2)} KB → WEBP: ${outputSize.toFixed(2)} KB (-${reduction}%)\n`);
    } catch (err) {
      console.error(`❌ Erro ao converter ${image.input}:`, err.message);
    }
  }

  console.log('✨ Conversão concluída!');
  console.log('\n📝 Próximo passo: Atualizar index.html para usar WEBP como preferência');
}

convertImages().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
