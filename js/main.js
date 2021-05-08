$(function(){
	secondary = $( '#secondary' );
	button = $( '.site-branding' ).find( '.secondary-toggle' );

	// Enable menu toggle for small screens.
	( function() {
		var menu, widgets, social;
		if ( ! secondary || ! button ) {
			return;
		}

		button.on( 'click', function() {
			secondary.toggleClass( 'toggled-on' );
			secondary.trigger( 'resize' );
			$( this ).toggleClass( 'toggled-on' );
			if ( $( this, secondary ).hasClass( 'toggled-on' ) ) {
				$( this ).attr( 'aria-expanded', 'true' );
				secondary.attr( 'aria-expanded', 'true' );
			} else {
				$( this ).attr( 'aria-expanded', 'false' );
				secondary.attr( 'aria-expanded', 'false' );
			}
		} );
	} )();
	
	footer = $( '#infinite-footer' );
	setInterval( function() {
			// Reveal footer
		if ( $(window).scrollTop() >= 350 )
			footer.animate( { 'bottom': 0 }, 'fast' );
		else if ( $(window).scrollTop() < 350 )
			footer.animate( { 'bottom': '-50px' }, 'fast' );
		}, 250 );
})