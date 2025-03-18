

/* Porfolio */

function tabsFilters() {
    const tabs = document.querySelectorAll('.dropdown a');
    const projets = document.querySelectorAll('.portfolio .card');
  
    const resetActiveLinks = () => {
      tabs.forEach(elem => {
        elem.classList.remove('active');
      })
    }
  
    const showProjets = (elem) => {
      console.log(elem);
      projets.forEach(projet => {
  
        let filter = projet.getAttribute('data-category');
  
        if (elem === 'all') {
          projet.parentNode.classList.remove('hide');
          return
        }
  
        console.log('tutu');
        // ne sera pas pris en compte !
        /*if (filter !== elem) {
          projet.parentNode.classList.add('hide');
        } else {
          projet.parentNode.classList.remove('hide');
        }*/
  
        // option pour les plus motivés - opérateur ternaire
        filter !== elem ? projet.parentNode.classList.add('hide') : projet.parentNode.classList.remove('hide');
  
      });
    }
  
    tabs.forEach(elem => {
      elem.addEventListener('click', (event) => {
        event.preventDefault();
        let filter = elem.getAttribute('data-filter');
        showProjets(filter)
        resetActiveLinks();
        elem.classList.add('active');
      });
    })
  }
  
  tabsFilters()
  
  
  
  
  
  
  