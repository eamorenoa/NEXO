import test from 'node:test'; import assert from 'node:assert/strict'; import { classifyNeed } from '../src/services/classifyNeed.js';
test('clasifica empleo',()=>assert.equal(classifyNeed('busco empleo cerca de mi casa').category,'job'));
test('clasifica reporte',()=>assert.equal(classifyNeed('quiero reportar un problema de basura').category,'report'));
test('clasifica donacion',()=>assert.equal(classifyNeed('quiero donar ropa').category,'donation'));
