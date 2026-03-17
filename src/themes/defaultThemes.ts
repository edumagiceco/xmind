import type { Theme } from '../model/types';

export const defaultTheme: Theme = {
  id: 'default',
  name: 'Classic Blue',
  centralTopic: { fillColor: '#4a90d9', borderColor: '#357abd', borderWidth: 2, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  mainTopic: { fillColor: '#ffffff', borderColor: '#4a90d9', borderWidth: 1.5, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#1a1a1a', fontSize: 14, fontWeight: 'normal' },
  subTopic: { fillColor: '#f8f9fa', borderColor: '#d0d0d0', borderWidth: 1, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#333333', fontSize: 12, fontWeight: 'normal' },
  floatingTopic: { fillColor: '#fff3cd', borderColor: '#ffc107', borderWidth: 1, borderStyle: 'dashed', shape: 'rounded-rect', fontColor: '#333333', fontSize: 12, fontWeight: 'normal' },
  connectionStyle: { lineColor: '#4a90d9', lineWidth: 2, lineStyle: 'curved' },
  canvas: { backgroundColor: '#f5f5f5' },
  colorPalette: ['#4a90d9', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#3498db'],
};

const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark Mode',
  centralTopic: { fillColor: '#bb86fc', borderColor: '#9a67ea', borderWidth: 2, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#1e1e2e', fontSize: 18, fontWeight: 'bold' },
  mainTopic: { fillColor: '#2d2d44', borderColor: '#bb86fc', borderWidth: 1.5, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#e0e0e0', fontSize: 14, fontWeight: 'normal' },
  subTopic: { fillColor: '#1e1e2e', borderColor: '#444444', borderWidth: 1, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#b0b0b0', fontSize: 12, fontWeight: 'normal' },
  floatingTopic: { fillColor: '#2d2d44', borderColor: '#bb86fc', borderWidth: 1, borderStyle: 'dashed', shape: 'rounded-rect', fontColor: '#e0e0e0', fontSize: 12, fontWeight: 'normal' },
  connectionStyle: { lineColor: '#bb86fc', lineWidth: 2, lineStyle: 'curved' },
  canvas: { backgroundColor: '#121212' },
  colorPalette: ['#bb86fc', '#03dac6', '#cf6679', '#985eff', '#00bfa5', '#7c4dff', '#64ffda', '#ea80fc'],
};

const minimalTheme: Theme = {
  id: 'minimal',
  name: 'Minimal',
  centralTopic: { fillColor: '#333333', borderColor: '#333333', borderWidth: 2, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  mainTopic: { fillColor: '#ffffff', borderColor: '#333333', borderWidth: 1.5, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#1a1a1a', fontSize: 14, fontWeight: 'normal' },
  subTopic: { fillColor: '#ffffff', borderColor: '#e0e0e0', borderWidth: 1, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#1a1a1a', fontSize: 12, fontWeight: 'normal' },
  floatingTopic: { fillColor: '#f5f5f5', borderColor: '#999999', borderWidth: 1, borderStyle: 'dashed', shape: 'rounded-rect', fontColor: '#1a1a1a', fontSize: 12, fontWeight: 'normal' },
  connectionStyle: { lineColor: '#333333', lineWidth: 1.5, lineStyle: 'curved' },
  canvas: { backgroundColor: '#ffffff' },
  colorPalette: ['#333333', '#555555', '#777777', '#999999', '#aaaaaa', '#bbbbbb', '#cccccc', '#444444'],
};

const oceanTheme: Theme = {
  id: 'ocean',
  name: 'Ocean',
  centralTopic: { fillColor: '#0077b6', borderColor: '#005f8a', borderWidth: 2, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  mainTopic: { fillColor: '#caf0f8', borderColor: '#0096c7', borderWidth: 1.5, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#023e8a', fontSize: 14, fontWeight: 'normal' },
  subTopic: { fillColor: '#e8f8ff', borderColor: '#90e0ef', borderWidth: 1, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#023e8a', fontSize: 12, fontWeight: 'normal' },
  floatingTopic: { fillColor: '#caf0f8', borderColor: '#48cae4', borderWidth: 1, borderStyle: 'dashed', shape: 'rounded-rect', fontColor: '#023e8a', fontSize: 12, fontWeight: 'normal' },
  connectionStyle: { lineColor: '#0096c7', lineWidth: 2, lineStyle: 'curved' },
  canvas: { backgroundColor: '#f0f9ff' },
  colorPalette: ['#0077b6', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#023e8a', '#0077b6', '#00b4d8'],
};

const forestTheme: Theme = {
  id: 'forest',
  name: 'Forest',
  centralTopic: { fillColor: '#2d6a4f', borderColor: '#1b4332', borderWidth: 2, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  mainTopic: { fillColor: '#d8f3dc', borderColor: '#40916c', borderWidth: 1.5, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#1b4332', fontSize: 14, fontWeight: 'normal' },
  subTopic: { fillColor: '#edf6ef', borderColor: '#95d5b2', borderWidth: 1, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#1b4332', fontSize: 12, fontWeight: 'normal' },
  floatingTopic: { fillColor: '#d8f3dc', borderColor: '#52b788', borderWidth: 1, borderStyle: 'dashed', shape: 'rounded-rect', fontColor: '#1b4332', fontSize: 12, fontWeight: 'normal' },
  connectionStyle: { lineColor: '#40916c', lineWidth: 2, lineStyle: 'curved' },
  canvas: { backgroundColor: '#f5faf7' },
  colorPalette: ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#1b4332', '#368b5e', '#2d6a4f'],
};

const sunsetTheme: Theme = {
  id: 'sunset',
  name: 'Sunset',
  centralTopic: { fillColor: '#e76f51', borderColor: '#c45a3c', borderWidth: 2, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  mainTopic: { fillColor: '#fef0e6', borderColor: '#f4845f', borderWidth: 1.5, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#6b2c1a', fontSize: 14, fontWeight: 'normal' },
  subTopic: { fillColor: '#fff5ef', borderColor: '#f4a261', borderWidth: 1, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#6b2c1a', fontSize: 12, fontWeight: 'normal' },
  floatingTopic: { fillColor: '#fef0e6', borderColor: '#e9c46a', borderWidth: 1, borderStyle: 'dashed', shape: 'rounded-rect', fontColor: '#6b2c1a', fontSize: 12, fontWeight: 'normal' },
  connectionStyle: { lineColor: '#f4845f', lineWidth: 2, lineStyle: 'curved' },
  canvas: { backgroundColor: '#fffaf5' },
  colorPalette: ['#e76f51', '#f4845f', '#f4a261', '#e9c46a', '#e63946', '#d62828', '#f77f00', '#fcbf49'],
};

const purpleTheme: Theme = {
  id: 'purple',
  name: 'Purple Dream',
  centralTopic: { fillColor: '#7c3aed', borderColor: '#6d28d9', borderWidth: 2, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  mainTopic: { fillColor: '#ede9fe', borderColor: '#8b5cf6', borderWidth: 1.5, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#3b0764', fontSize: 14, fontWeight: 'normal' },
  subTopic: { fillColor: '#f5f3ff', borderColor: '#c4b5fd', borderWidth: 1, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#3b0764', fontSize: 12, fontWeight: 'normal' },
  floatingTopic: { fillColor: '#ede9fe', borderColor: '#a78bfa', borderWidth: 1, borderStyle: 'dashed', shape: 'rounded-rect', fontColor: '#3b0764', fontSize: 12, fontWeight: 'normal' },
  connectionStyle: { lineColor: '#8b5cf6', lineWidth: 2, lineStyle: 'curved' },
  canvas: { backgroundColor: '#faf5ff' },
  colorPalette: ['#7c3aed', '#8b5cf6', '#a78bfa', '#6d28d9', '#5b21b6', '#c084fc', '#9333ea', '#7e22ce'],
};

const monoTheme: Theme = {
  id: 'mono',
  name: 'Monochrome',
  centralTopic: { fillColor: '#1a1a1a', borderColor: '#000000', borderWidth: 2, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  mainTopic: { fillColor: '#f5f5f5', borderColor: '#1a1a1a', borderWidth: 1.5, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#1a1a1a', fontSize: 14, fontWeight: 'normal' },
  subTopic: { fillColor: '#e8e8e8', borderColor: '#999999', borderWidth: 1, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#333333', fontSize: 12, fontWeight: 'normal' },
  floatingTopic: { fillColor: '#f0f0f0', borderColor: '#666666', borderWidth: 1, borderStyle: 'dashed', shape: 'rounded-rect', fontColor: '#333333', fontSize: 12, fontWeight: 'normal' },
  connectionStyle: { lineColor: '#1a1a1a', lineWidth: 1.5, lineStyle: 'curved' },
  canvas: { backgroundColor: '#ffffff' },
  colorPalette: ['#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3', '#404040'],
};

const candyTheme: Theme = {
  id: 'candy',
  name: 'Candy',
  centralTopic: { fillColor: '#ec4899', borderColor: '#db2777', borderWidth: 2, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  mainTopic: { fillColor: '#fce7f3', borderColor: '#f472b6', borderWidth: 1.5, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#831843', fontSize: 14, fontWeight: 'normal' },
  subTopic: { fillColor: '#fdf2f8', borderColor: '#f9a8d4', borderWidth: 1, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#831843', fontSize: 12, fontWeight: 'normal' },
  floatingTopic: { fillColor: '#fce7f3', borderColor: '#f472b6', borderWidth: 1, borderStyle: 'dashed', shape: 'rounded-rect', fontColor: '#831843', fontSize: 12, fontWeight: 'normal' },
  connectionStyle: { lineColor: '#f472b6', lineWidth: 2, lineStyle: 'curved' },
  canvas: { backgroundColor: '#fff5f9' },
  colorPalette: ['#ec4899', '#f472b6', '#a855f7', '#d946ef', '#f43f5e', '#fb7185', '#c084fc', '#e879f9'],
};

const earthTheme: Theme = {
  id: 'earth',
  name: 'Earth Tone',
  centralTopic: { fillColor: '#92400e', borderColor: '#78350f', borderWidth: 2, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  mainTopic: { fillColor: '#fef3c7', borderColor: '#b45309', borderWidth: 1.5, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#78350f', fontSize: 14, fontWeight: 'normal' },
  subTopic: { fillColor: '#fffbeb', borderColor: '#d97706', borderWidth: 1, borderStyle: 'solid', shape: 'rounded-rect', fontColor: '#78350f', fontSize: 12, fontWeight: 'normal' },
  floatingTopic: { fillColor: '#fef3c7', borderColor: '#b45309', borderWidth: 1, borderStyle: 'dashed', shape: 'rounded-rect', fontColor: '#78350f', fontSize: 12, fontWeight: 'normal' },
  connectionStyle: { lineColor: '#b45309', lineWidth: 2, lineStyle: 'curved' },
  canvas: { backgroundColor: '#fffdf5' },
  colorPalette: ['#92400e', '#b45309', '#d97706', '#f59e0b', '#78350f', '#a16207', '#ca8a04', '#854d0e'],
};

export const themePresets: Theme[] = [
  defaultTheme, darkTheme, minimalTheme, oceanTheme, forestTheme,
  sunsetTheme, purpleTheme, monoTheme, candyTheme, earthTheme,
];
