/**
 * Каталог. Для замены заглушки укажите src и (для видео) cover.
 * Пути: './assets/media/poster-01.webp', './assets/media/film-01.mp4'.
 * description — о чём работа; references — фото продукта/исходных образов.
 * Референс: { src: './assets/references/photo.jpg', alt: 'Продукт', caption: 'Исходное фото' }.
 * Оставьте src: '' для заглушки. Число и порядок работ меняются здесь.
 */
export const site = {
  name: 'sreda.ai',
  email: '', // Ваш настоящий адрес; пустое значение не создаёт выдуманный контакт.
  telegram: '', // Например: https://t.me/yourname
  instagram: '',
  formEndpoint: 'https://script.google.com/macros/s/AKfycbwXJ0aeT3vJBGvO-rQ-InecGxNRAEOpl5mVX2_u2lhWxBdbvhI6-UPSFVjg19QnguXcLA/exec', // Google Sheets + Telegram; токен хранится только в Apps Script.
};
const colors = ['#8397ba','#987cae','#6ca9aa','#a9987c','#9294b4','#7ca58e','#af8099','#6e9ca7','#a2a17b','#8f7dab','#78a6a3','#9a8296','#7e99b0','#aa947a','#859d96'];
export const works = Array.from({ length: 15 }, (_, i) => ({
  id: `poster-${String(i + 1).padStart(2, '0')}`,
  title: `POSTER ${String(i + 1).padStart(2, '0')}`,
  type: 'poster',
  year: '2026',
  src: '',
  cover: '',
  accent: colors[i],
  references: [],
  description: 'Место для будущего постера. Скоро здесь появится работа sreda.ai.',
}));
// Три клипа встроены в общий маршрут; всего 18 работ.
for (let i = 0; i < 3; i++) {
  works.splice((i + 1) * 6 - 1, 0, {
    id: `film-0${i + 1}`, title: `FILM 0${i + 1}`, type: 'video', year: '2026',
    src: '', cover: '', accent: ['#7ca8a4','#a18eaf','#829ab8'][i],
    references: [],
    description: 'Место для будущего видеоклипа. Скоро здесь появится работа sreda.ai.',
  });
}

// Осеннее барное меню: готовый постер и описание от пользователя.
Object.assign(works.find(work => work.id === 'poster-01'), {
  src: './assets/media/poster-01.jpg',
  references: [{
    src: './assets/references/poster-01-cocktails.png',
    alt: 'Шесть коктейлей на столе в баре — исходное фото для осеннего меню.',
    caption: 'Исходное фото коктейлей',
  }],
  description: 'Исходные материалы: 6 любительских фотографий напитков, снятых барменом.\n\nЗадача: на основе референса создать эстетичный постер осеннего барного меню: передать сезонное настроение для рассылки блогерам, публикаций и сторис в Instagram.',
});

// Мультфильм пользователя из 1008.mov, подготовленный для браузерного просмотра.
Object.assign(works.find(work => work.id === 'film-01'), {
  src: './assets/media/film-01.mp4',
  cover: './assets/media/film-01-cover.jpg',
  description: 'Анимационный фильм · 02:15',
});

// Для описания и референсов конкретной работы добавьте такой блок:
// Object.assign(works.find(work => work.id === 'poster-01'), {
//   description: 'О чём постер, какой продукт показан и какая была идея.',
//   references: [
//     { src: './assets/references/product-front.jpg', alt: 'Продукт спереди', caption: 'Исходный продукт' },
//     { src: './assets/references/product-detail.jpg', alt: 'Деталь упаковки', caption: 'Цвет и фактура' },
//   ],
// });
