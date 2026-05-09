import './styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initHeader } from '@/js/header.js';
import { initAnimations } from '@/js/animations.js';
import { initPromoPopup } from '@/js/promo-popup.js';
import { initShopifyStorefront } from '@/js/shopify-app.js';

gsap.registerPlugin(ScrollTrigger);

document.addEventListener('DOMContentLoaded', async () => {
  initHeader();
  initAnimations(gsap);
  initPromoPopup();
  await initShopifyStorefront();
});
