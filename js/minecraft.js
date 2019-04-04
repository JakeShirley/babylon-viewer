(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.Minecraft = {})));
}(this, (function (exports) { 'use strict';

	// Stripping JSON comments
	//   From: https://www.npmjs.com/package/strip-json-comments
	const singleComment = 1;
	const multiComment = 2;
	const stripWithoutWhitespace = () => '';
	const stripWithWhitespace = (str, start, end) => str.slice(start, end).replace(/\S/g, ' ');

	let StripJsonComments = (str, opts) => {
		opts = opts || {};

		const strip = opts.whitespace === false ? stripWithoutWhitespace : stripWithWhitespace;

		let insideString = false;
		let insideComment = false;
		let offset = 0;
		let ret = '';

		for (let i = 0; i < str.length; i++) {
			const currentChar = str[i];
			const nextChar = str[i + 1];

			if (!insideComment && currentChar === '"') {
				const escaped = str[i - 1] === '\\' && str[i - 2] !== '\\';
				if (!escaped) {
					insideString = !insideString;
				}
			}

			if (insideString) {
				continue;
			}

			if (!insideComment && currentChar + nextChar === '//') {
				ret += str.slice(offset, i);
				offset = i;
				insideComment = singleComment;
				i++;
			} else if (insideComment === singleComment && currentChar + nextChar === '\r\n') {
				i++;
				insideComment = false;
				ret += strip(str, offset, i);
				offset = i;
				continue;
			} else if (insideComment === singleComment && currentChar === '\n') {
				insideComment = false;
				ret += strip(str, offset, i);
				offset = i;
			} else if (!insideComment && currentChar + nextChar === '/*') {
				ret += str.slice(offset, i);
				offset = i;
				insideComment = multiComment;
				i++;
				continue;
			} else if (insideComment === multiComment && currentChar + nextChar === '*/') {
				i++;
				insideComment = false;
				ret += strip(str, offset, i + 1);
				offset = i + 1;
				continue;
			}
		}

		return ret + (insideComment ? strip(str.substr(offset)) : str.substr(offset));
	};

	// Block Material
	exports.BlockSide = {};
	exports.BlockSide.TOP = "up";
	exports.BlockSide.BOTTOM = "down";
	exports.BlockSide.NORTH = "north";
	exports.BlockSide.SOUTH = "south";
	exports.BlockSide.EAST = "east";
	exports.BlockSide.WEST = "west";

	function BlockMaterial(blockName, textures) {
		this.type = 'BlockMaterial';

		this.blockName = blockName;
		this.textures = {};

		// Logic from BlockGraphics::setTextures
		if(typeof(textures) == "string" || Array.isArray(textures)) {
			this.textures[exports.BlockSide.TOP] = textures;
			this.textures[exports.BlockSide.BOTTOM] = textures;
			this.textures[exports.BlockSide.NORTH] = textures;
			this.textures[exports.BlockSide.SOUTH] = textures;
			this.textures[exports.BlockSide.EAST] = textures;
			this.textures[exports.BlockSide.WEST] = textures;
		}
		else if(typeof(textures) == "object") {
			if(textures.side) {
				this.textures[exports.BlockSide.TOP] = textures[exports.BlockSide.TOP];
				this.textures[exports.BlockSide.BOTTOM] = textures[exports.BlockSide.BOTTOM];
				this.textures[exports.BlockSide.NORTH] = textures["side"] ;
				this.textures[exports.BlockSide.SOUTH] = textures["side"];
				this.textures[exports.BlockSide.EAST] = textures["side"];
				this.textures[exports.BlockSide.WEST] = textures["side"];
			}
			else {
				this.textures[exports.BlockSide.TOP] = textures[exports.BlockSide.TOP];
				this.textures[exports.BlockSide.BOTTOM] = textures[exports.BlockSide.BOTTOM];
				this.textures[exports.BlockSide.NORTH] = textures[exports.BlockSide.NORTH] ;
				this.textures[exports.BlockSide.SOUTH] = textures[exports.BlockSide.SOUTH];
				this.textures[exports.BlockSide.EAST] = textures[exports.BlockSide.EAST];
				this.textures[exports.BlockSide.WEST] = textures[exports.BlockSide.WEST];
			}
		}

		this.getTexture = function(face, auxValue) {
			let result = null;

			let currentTexture = this.textures[face];
			if(Array.isArray(currentTexture)) {
				if(auxValue >= 0 && auxValue < currentTexture.length) {
					result = currentTexture[auxValue];
				}
				else {
					result = currentTexture[0];
				}
			}
			else if(currentTexture) {
				result = currentTexture;
			}

			// Strip path to texture, just use texture name
			if(result) {
				var texturePath;
				if(typeof(result) == "string") {
					texturePath = result
				}
				else {
					texturePath = result.path;
				}

				return texturePath.substring(texturePath.lastIndexOf("/") + 1);
			}

			return null;
		}
	}

	BlockMaterial.prototype = Object.create(BlockMaterial.prototype);
	BlockMaterial.prototype.constructor = BlockMaterial;

    let LoadBlockMaterials = function(pathToTexturePack, callback) {
        var fileLoader = new THREE.FileLoader();

		fileLoader.load(`${pathToTexturePack}/blocks.json`,
			function(metaDataRaw) {
				let blockMaterials = JSON.parse(StripJsonComments(metaDataRaw));
					
				// Remove format_version
				delete blockMaterials.format_version; 

				// Load block data
				fileLoader.load(`${pathToTexturePack}/terrain_texture.json`,
					function(terrainTexturesRaw) {
						let terrainTextures = JSON.parse(StripJsonComments(terrainTexturesRaw));

						let resultMaterials = {};
						for (var blockName in blockMaterials) {
							let blockMaterial = blockMaterials[blockName];

							if(blockMaterial.textures) {
								if(typeof(blockMaterial.textures) == "object") {
									let blockTextures = {};
									for(var face in blockMaterial.textures) {
										blockTextures[face] = terrainTextures.texture_data[blockMaterial.textures[face]].textures;
									}

									let newMaterial = new BlockMaterial(blockName, blockTextures);
									resultMaterials[blockName] = newMaterial;
								}
								else {
									let blockTextures = terrainTextures.texture_data[blockMaterial.textures].textures;
									let newMaterial = new BlockMaterial(blockName, blockTextures);
								
									resultMaterials[blockName] = newMaterial;
								}
							}
						}

						callback(resultMaterials);
					}
				);
			},
			null,
			function(error) {
				console.log(`Block Material loading error: ${error}`);
			}
		);
	};

	// TextureAtlas
	function TextureAtlas(atlasMetaData, atlasTexture) {
		this.type = 'TextureAtlas';

		this.texture = atlasTexture;
		this.entries = {};
		this.meta = atlasMetaData.meta;

		for(var i = 0; i < atlasMetaData['frames'].length; ++i) {
			let currentEntry = atlasMetaData['frames'][i];
			let nakedFileName = currentEntry.filename.replace('.png', '').replace('.tga', '');

			currentEntry.uv0 = new THREE.Vector2(
				currentEntry.frame.x / this.meta.size.w, 
				1 - (currentEntry.frame.y / this.meta.size.h)
			);

			currentEntry.uv1 = new THREE.Vector2(
				(currentEntry.frame.x + currentEntry.frame.w) / this.meta.size.w, 
				1 - ((currentEntry.frame.y + currentEntry.frame.h) / this.meta.size.h)
			);

			this.entries[nakedFileName] = currentEntry;
		}

		
		this.getAtlasEntry = function(name) {
			let nakedFileName = name.replace('.png', '').replace('.tga', '');

			return this.entries[nakedFileName];
		}
	}

	TextureAtlas.prototype = Object.create(TextureAtlas.prototype);
	TextureAtlas.prototype.constructor = TextureAtlas;

	let LoadAtlasMetadata = function(pathToTexturePack, callback) {
        var fileLoader = new THREE.FileLoader();

		fileLoader.load(`${pathToTexturePack}/atlas.json`,
			function(metaDataRaw) {
				let atlasMetaData = JSON.parse(StripJsonComments(metaDataRaw));
				callback(atlasMetaData);
			},
			null,
			function(error) {
				console.log(`Atlas loading error: ${error}`);
			}
		);
	};

	// TexturePack
	function TexturePack(path, blockMaterials, atlasMetaData, atlasTexture) {
		this.type = 'TexturePack';

		this.path = path;
		this.blockMaterials = blockMaterials;
		this.atlas = new TextureAtlas(atlasMetaData, atlasTexture);
	}

	TexturePack.prototype = Object.create(TexturePack.prototype);
	TexturePack.prototype.constructor = TexturePack;

	exports.LoadTexturePack = function(pathToTexturePack, callback) {
		// Load materials
		LoadBlockMaterials(pathToTexturePack, function(blockMaterials) {

			LoadAtlasMetadata(pathToTexturePack, function(atlasMetaData) {
				var imageLoader = new THREE.TextureLoader();
				var atlasTexture = imageLoader.load(`${pathToTexturePack}/atlas.png`);
				atlasTexture.magFilter = THREE.NearestFilter;
				atlasTexture.minFilter = THREE.NearestFilter;
	
				
				let texturePack = new TexturePack(
					pathToTexturePack,
					blockMaterials,
					atlasMetaData,
					atlasTexture,
				);

				callback(texturePack);
			});
		});
	};

	// Block Schema
	function BlockSchema() {
		this.type = 'BlockSchema';

		// Map of blocks
		this.intermediateToNative = {};

		this.getBlockFromIntermediate = function(intermediateBlock) {
			let blockEntry = this.intermediateToNative[intermediateBlock];

			if(blockEntry) {
				return blockEntry;
			}
			
			return null;
		}
	}

	BlockSchema.prototype = Object.create(BlockSchema.prototype);
	BlockSchema.prototype.constructor = BlockSchema;
	
	exports.LoadBlockSchema = function(assetsManager, pathToFile, callback) {

		var textTask = assetsManager.addTextFileTask("LoadBlockSchema", pathToFile);
		textTask.onSuccess = function(task) {
			let blockSchema = JSON.parse(StripJsonComments(task.text));
				
			let result = new BlockSchema();
			for(var blockName in blockSchema) {
				let blockEntry = blockSchema[blockName];

				let entry = {
					"name": blockEntry.name.replace('minecraft:', ''),
					"data": blockEntry.data
				};

				result.intermediateToNative[blockName] = entry;
			}

			callback(result);
		};
		textTask.onError = function (task, message, exception) {
			console.log(`Block Schema loading error: ${message}`);
		}

		assetsManager.load();
	};

})));