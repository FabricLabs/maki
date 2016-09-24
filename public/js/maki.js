$(window).on('load', function() {
  // Semantic UI crap
  /*$('.dropdown:not(.multiple.search)').dropdown();
  $('.ui.rating').rating();
  $('.tooltipped').popup();
  //$('.ui.sticky').sticky();

  $('.message .close').on('click', function() {
    $(this).closest('.message').fadeOut();
  });
  $('.tabular.menu .item').tab();
  $('.ui.search').search({
    apiSettings: {
      url: '/search?q={query}'
    },
    type: 'category',
    onSelect: function(result, response) {
      var self = this;
      console.log('controller:', self);
      console.log('selected', result);
      $(self).children('input').val( result.id );
    }
  });*/

  // Register the ServiceWorker
  navigator.serviceWorker.register('service-worker.js', {
    scope: '.'
  }).then(function(registration) {
    console.log('The service worker has been registered ', registration);
  });

  // Listen for claiming of our ServiceWorker
  navigator.serviceWorker.addEventListener('controllerchange', function(event) {
    console.log(
      '[controllerchange] A "controllerchange" event has happened ' +
      'within navigator.serviceWorker: ', event
    );

    // Listen for changes in the state of our ServiceWorker
    navigator.serviceWorker.controller.addEventListener('statechange',
      function() {
        console.log('[controllerchange][statechange] ' +
          'A "statechange" has occured: ', this.state
        );

      // If the ServiceWorker becomes "activated", let the user know they can go offline!
        if (this.state === 'activated') {
          // Show the "You may now use offline" notification
          document.getElementById('offlineNotification')
          .classList.remove('hidden');
        }
      }
    );
  });
});
