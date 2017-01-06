'use strict';
const _ = require('lodash');
const util = require('./common/util');
const fs = require('fs');
const async = require('async');

zibenyunzuo();

function zibenyunzuo(){
	
	async.waterfall([
        (_cb) => {
            sign(_cb);
        },
        (token, _cb) => {
			console.log(token);
            getStockList(token, _cb);
        },
        (token, list, _cb) => {
			//console.log(list);
            getContent(token, list, _cb);
        }
    ], (err) => {
        if (err) {
            console.log(err);
        }
        else {
            console.log('zibenyunzuo success');
        }
    });
}

function sign(cb){
	var url = 'https://gw.yundzh.com/token/access?appid=dcdc435cc4aa11e587bf0242ac1101de&secret_key=InsQbm2rXG5z';
	util.getData(url, (err, data) => {
		if (err){
			return cb(err);
		}
		if (typeof data == 'string') {
			data = JSON.parse(data);
		}
		cb(null, data.Data.RepDataToken[0].token);
	})
}

function getStockList(token, cb) {

	var link = 'https://gw.yundzh.com/stkdata?gql=block=' +
		encodeURIComponent('股票') + '\\' + encodeURIComponent('市场分类') + '\\'
		+ encodeURIComponent('全部A股') + '&token=' + token;

	util.getData(link,(err, data) => {
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (data.Err) {
			return cb(data.Err);
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				return cb(e)

			}

		}
		
		if (!data.Data || !data.Data.RepDataStkData){
			console.log(JSON.stringify(data));
			return cb('data exception');
		}
		
		let list = [];
		let stocks = data.Data.RepDataStkData;
		stocks.forEach((item) => {
			list.push(item.Obj);
		});
		cb(null, token, list);
	});
}

function getContent(token, list, cb){
	
	async.eachSeries(list, (stock, _cb) => {
		var myData = {
			stock: stock,
		}
		async.waterfall([
			(__cb) => {
				getTouzi(stock, token, __cb);
			},
			(touzi, __cb) => {
				myData.touzi = touzi;
				getQitatouzi(stock, token, __cb);
			},
			(qitatouzi, __cb) => {
				myData.qitatouzi = qitatouzi;
				let url = "https://gw.yundzh.com/f10/zbyz/rzqkzfyss?obj=";
				let link = url + stock + '&token=' + token;
				getRongzi(link, __cb);
			},
			(rongzi, __cb) => {
				myData.rongzi = rongzi;
				let url = "https://gw.yundzh.com/f10/zbyz/xmtz/mjzjqk?obj=";
				let link = url + stock + '&token=' + token;
				getMujizijin(link, __cb);
			},
			(mujizijin, __cb) => {
				myData.mujizijin = mujizijin;
				let url = "https://gw.yundzh.com/f10/zbyz/xmtz/mjzjcnxm?obj=";
				let link = url + stock + '&token=' + token;
				getZijinshiyong(link, __cb);
			},
			(zijinshiyong, __cb) => {
				myData.zijinshiyong = zijinshiyong;
				let outputFilename = '../../f10/zibenyunzuo/' + stock + '.json';
				fs.writeFile(outputFilename, JSON.stringify(myData, null, 4), __cb);
			}], (err) => {
				if (err) return _cb(err);
				_cb();
			}
		);
	},(err) => {
		if (err) return cb(err);
		cb();
	})
	
}


function getTouzi(stock, token, cb) {

		let url = "https://gw.yundzh.com/f10/zbyz/cyqtsszq?obj=";
		let link = url + stock + '&token=' + token;
		util.getData(link, (err, data) => {
			
			if (err) {
				return cb(err);
			} else if (!data) {
				return cb('no data');
			} else if (data.Err) {
				return cb(data.Err);
			} else if (typeof data == 'string') {
				try {
					data = JSON.parse(data);
				} catch (e) {
					console.log(url, e)
					return cb(null, {})
				}
			}
				
			if (!data.Data || !data.Data.RepDataF10ZbyzCyqtsszqOutPut || !data.Data.RepDataF10ZbyzCyqtsszqOutPut[0]){
				console.log(link,'data null');
				return cb(null, {});
			}
			
			let infos = data.Data.RepDataF10ZbyzCyqtsszqOutPut[0].data;
			if (!infos.length || infos.length < 1) {
				console.log(link,'data null');
				return _cb(null, {});
			}
			let info = infos[infos.length - 1];
			cb(null, {
				date: info.date,
				data: _.map(info.data, (item) => {
					return {
						btzzqdm: util.isNull(item.btzzqdm),
						btzzqjc: util.isNull(item.btzzqjc),
						zbl: util.isNull(item.zbl, '%'),
						cstzje: util.isBigNumber(item.cstzje)
					}
				})
			});
		});

}

function getQitatouzi(stock, token, cb) {
	
		let url = "https://gw.yundzh.com/f10/zbyz/cyfssgq?obj=";
		let link = url + stock + '&token=' + token;
		util.getData(link, (err, data) => {
			
			if (err) {
				return cb(err);
			} else if (!data) {
				return cb('no data');
			} else if (data.Err) {
				return cb(data.Err);
			} else if (typeof data == 'string') {
				try {
					data = JSON.parse(data);
				} catch (e) {
					console.log(url, e)
					return cb(null, {})
				}
			}
				
			if (!data.Data || !data.Data.RepDataF10ZbyzCyfssgqOutPut || !data.Data.RepDataF10ZbyzCyfssgqOutPut[0]){
				console.log(link,'data null');
				return cb(null, {});
			}
			
			let infos = data.Data.RepDataF10ZbyzCyfssgqOutPut[0].data;
			if (!infos.length || infos.length < 1) {
				console.log(link,'data null');
				return cb(null, {});
			}

			let info = infos[infos.length - 1];
			cb(null, {
				date: info.date,
				data: _.map(info.data, (item) => {
					return {
						scdxmc: util.isNull(item.scdxmc),
						cstzje: util.isBigNumber(item.cstzje),
						zbl: util.isNull(item.zbl, '%'),
						qmzmjz: util.isBigNumber(item.qmzmjz)
					}
				})
			});
		});
}

function getRongzi(url, cb) {
	
	util.getData(url, (err, data) => {
			
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (data.Err) {
			return cb(data.Err);
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, [])
			}
		}
			
		if (!data.Data || !data.Data.RepDataF10zbyzRzqkzfyssOutPut || !data.Data.RepDataF10zbyzRzqkzfyssOutPut[0]){
			console.log(url,'data exception');
			return cb(null, []);
		}
		
		let infos = data.Data.RepDataF10zbyzRzqkzfyssOutPut[0].data;
		if (!infos || infos.length < 1) {
			console.log(url, 'special data');
			return cb(null, []);
		}

		cb(null, _.map(infos, (item) => {
			return {
				sgr: util.isNull(item.sgr),
				rzlb: util.isNull(item.rzlb),
				fxjg: util.isNull(item.fxjg, '元'),
				rzje: util.isBigNumber(item.zzfx * item.fxjg)
			}
		}));
	});
}


function getMujizijin(url, cb) {
	
	util.getData(url, (err, data) => {
			
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (data.Err) {
			return cb(data.Err);
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, {})
			}
		}
			
		if (!data.Data || !data.Data.RepDataF10ZbyzXmtzMjzjqkOutPut || !data.Data.RepDataF10ZbyzXmtzMjzjqkOutPut[0]){
			console.log(url,'data exception');
			return cb(null, {});
		}
		
		let infos = data.Data.RepDataF10ZbyzXmtzMjzjqkOutPut[0].data;
		if (!infos || infos.length < 1) {
			console.log(url, 'null data');
			return cb(null, {});
		}

		for (let i = infos.length; i > 0 ; i--){
			if(infos[i-1].mjzjze && infos[i-1].jlsyje) {
				return cb(null, {
					date: infos[i-1].date,
					mjzjze: util.isNumber(infos[i-1].mjzjze),
					bqsyje: util.isNumber(infos[i-1].bqsyje),
					jlsyje: util.isNumber(infos[i-1].jlsyje)
				});
			}
		}
		cb(null, {});
	});
}


function getZijinshiyong(url, cb) {
	
	util.getData(url, (err, data) => {
			
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (data.Err) {
			return cb(data.Err);
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, [])
			}
		}
			
		if (!data.Data || !data.Data.RepDataF10ZbyzXmtzMjzjcnxmOutPut || !data.Data.RepDataF10ZbyzXmtzMjzjcnxmOutPut[0]){
			console.log(url,'data exception');
			return cb(null, []);
		}
		
		let infos = data.Data.RepDataF10ZbyzXmtzMjzjcnxmOutPut[0].data;
		if (!infos || infos.length < 1) {
			console.log(url, 'null data');
			return cb(null, []);
		}

		let info = infos[infos.length - 1];
		cb(null, [{
				date: util.isNull(info.date),
				data: _.map(info.data, (item) => {
					return {
						cnxmmc: util.isNull(item.cnxmmc),
						ntrje: util.isNumber(item.ntrje),
						sfbgxm: util.isNull(item.sfbgxm),
						sjtrje: util.isNumber(item.sjtrje),
						sffhjd: util.isNull(item.sffhjd)	
					}
				})
			}]
		);
	});
}