'use strict';

const util = require('./common/util');
const fs = require('fs');
const async = require('async');

gongsigaoguan();

function gongsigaoguan(){
	
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
            console.log('gongsigaosuan success');
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
	console.log('getContent');
	let url = "https://gw.yundzh.com/f10/glc?obj=";
	async.eachSeries(list, (stock, _cb) => {
		let link = url + stock + '&token=' + token;
		util.getData(link, (err, data) => {
			
			if (err) {
				return _cb(err);
			} else if (!data) {
				return _cb('no data');
			} else if (data.Err) {
				return cb(data.Err);
			} else if (typeof data == 'string') {
				try {
					data = JSON.parse(data);
				} catch (e) {
					return _cb(e)

				}

			}
			
			if (!data.Data || !data.Data.RepDataF10GlcOutPut || !data.Data.RepDataF10GlcOutPut[0]){
				console.log(token, data,'data exception');
				return _cb();
			}
			
			let persons = data.Data.RepDataF10GlcOutPut[0].data;
			let list = [];
			let details = [];
			persons.forEach((item) => {
				let person = {};
				person.xm = item.xm;
				person.zw = item.zw;
				person.xl = item.xl;
				person.xb = item.xb;
				person.csrq = item.csrq;
				list.push(person);
				let detail = {};
				detail.xm = item.xm;
				detail.rzsj = item.rzsj;
				detail.xb = item.xb;
				detail.xl = item.xl;
				detail.csrq = item.csrq;
				detail.zw = item.zw;
				detail.jl = item.jl;
				details.push(detail);
			})

			var myData = {
				stock: stock,
				list : list,
				details: details
			}

			var outputFilename = '../f10/gongsigaoguan/' + stock + '.json';

			fs.writeFile(outputFilename, JSON.stringify(myData, null, 4), function(err) {
				if(err) {
					_cb(err);
				} else {
					_cb();
				}
			});
		})
	},(err) => {
		if (err) return cb(err);
		cb();
	})
	
}
