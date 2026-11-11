


/* Menu mobile */

function menuMobile() {
  const btn = document.querySelector('.burger');
  const header = document.querySelector('.header');
  const menus = document.querySelectorAll('.navbar .menu');

  if (!btn || !header) return;

  menus.forEach((menu) => {
    if (menu.querySelector('.nav-instagram-mobile')) return;
    const li = document.createElement('li');
    li.className = 'nav-instagram-mobile';
    li.innerHTML = '<a class="nav-instagram" href="https://www.instagram.com/atelier_bigfoot/" data-cursor="pointer">in</a>';
    menu.appendChild(li);
  });

  const links = document.querySelectorAll('.navbar a');

  btn.addEventListener('click', () => {
    header.classList.toggle('show-nav');
  });

  links.forEach(link => {
    link.addEventListener('click', () => {
      header.classList.remove('show-nav');
    });
  });

}

menuMobile();

