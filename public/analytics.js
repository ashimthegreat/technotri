/* Google Analytics 4, loaded only when GA4_ID is set on the server. Sends a page view on every in-app navigation. */
(function(){
  var m=document.querySelector('meta[name="tt-ga4"]'); if(!m) return;
  var id=m.content; window.dataLayer=window.dataLayer||[];
  function gtag(){window.dataLayer.push(arguments)}
  window.gtag=gtag; gtag('js',new Date()); gtag('config',id,{send_page_view:false});
  function pv(){gtag('event','page_view',{page_location:location.href,page_title:document.title})}
  window.addEventListener('tt:route',pv);
})();
