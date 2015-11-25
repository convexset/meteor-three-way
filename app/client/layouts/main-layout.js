Template.MainLayout.onRendered(function() {
//TODO: change menu-clicker to proper binding
	$('.ui.sidebar').first()
	.sidebar('attach events', '.menu-clicker-temp');

	$('.ui.sidebar .menu .item').click(function () {
			$('.ui.sidebar')
			.sidebar('toggle');
		}
	);
});

