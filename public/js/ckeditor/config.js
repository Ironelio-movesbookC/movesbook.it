/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see https://ckeditor.com/legal/ckeditor-oss-license
 */

CKEDITOR.editorConfig = function( config ) {
	// Define changes to default configuration here. For example:
	// config.language = 'fr';
	// config.uiColor = '#AADC6E';

	config.allowedContent = true;
//config.uploadUrl = '/plugins/uploadfile/plugin.js';
//config.embed_provider = '//ckeditor.iframe.ly/api/oembed?url={url}&callback={callback}'
	// Remove some buttons provided by the standard plugins, which are
	// not needed in the Standard(s) toolbar.
	//config.removeButtons = 'Underline,Subscript,Superscript';
	// removePlugins:'uploadimage';

	// Set the most common block elements.
	//config.format_tags = 'p;h1;h2;h3;pre';

	// Simplify the dialog windows.
	//config.removeDialogTabs = 'image:advanced;link:advanced';

	baseURL = RootURL;
        config.filebrowserBrowseUrl = baseURL+'js/kcfinder/browse.php?type=files';
        config.filebrowserImageBrowseUrl =baseURL+'js/kcfinder/browse.php?type=images';
        config.filebrowserFlashBrowseUrl = baseURL+'js/kcfinder/browse.php?type=flash';
        config.filebrowserUploadUrl = baseURL+'js/kcfinder/upload.php?type=files';
        config.filebrowserImageUploadUrl =baseURL+'js/kcfinder/upload.php?type=images';
        config.filebrowserFlashUploadUrl =baseURL+'js/kcfinder/upload.php?type=flash';
        config.filebrowserUploadMethod='form';
};
