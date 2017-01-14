'use strict';
const _ = require('lodash');
const util = require('./common/util');
const fs = require('fs');
const async = require('async');

ziliao();

function ziliao(){
	
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
            console.log('ziliao success');
        }
    });
}
exports.ziliao = ziliao;
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
//let token = '00000010:1484115054:9929b596af6c49b257d43c62da30e1d0ff7c51e2'
//getContent(token,['SH600115'],function(err,ret) {
	//console.log(err,ret);
//})
function getContent(token, list, cb){
	
	async.eachSeries(list, (stock, _cb) => {
		var myData = {
			stock: stock,
		}
		async.waterfall([
			(__cb) => {
				getMainBussiness(stock, __cb);
			},
			(mainBussiness, __cb) => {
				myData.zhuyaozhibiao = mainBussiness;
				getIncomeStatement(stock, mainBussiness.gross_profit_rate,  __cb);
			},
			(incomeStatement, __cb) => {
				_.assign(myData.zhuyaozhibiao, incomeStatement);
				getClosePX(stock, __cb);
			},
			(close_px, __cb) => {
				let report_date = myData.zhuyaozhibiao.report_date;
				getHeadlines(stock, close_px, report_date, __cb);
			},
			(headline, __cb) => {
				_.assign(myData.zhuyaozhibiao, headline);
				getBalanceStatement(stock, __cb);
			},
			(balanceStatement, __cb) => {
				_.assign(myData.zhuyaozhibiao, balanceStatement);
				getTrend(stock, __cb);
			},
			(trend, __cb) => {
				_.assign(myData.zhuyaozhibiao, trend);
				getDashitixing(stock, __cb);
			},
			(dashitixing, __cb) => {
				myData.dashitixing = dashitixing;
				let url = "https://gw.yundzh.com/f10/rsr/proforecast?obj=";
				let link = url + stock + '&token=' + token;
				getYingliyuce(link, __cb);
			},
			(yingliyuce, __cb) => {
				myData.yingliyuce = yingliyuce;
			// 	getTouzi(stock, token, __cb);
			// },
			// (touzi, __cb) => {
			// 	myData.touzi = touzi;
			// 	let url = "https://gw.yundzh.com/f10/zbyz/rzqkzfyss?obj=";
			// 	let link = url + stock + '&token=' + token;
			// 	getRongzi(link, __cb);
			// },
			// (rongzi, __cb) => {
			// 	myData.rongzi = rongzi;
				let url = "https://gw.yundzh.com/f10/dstx/jjlt?obj=";
				let link = url + stock + '&token=' + token;
				getJieshoujiejin(link, __cb);
			},
			(jieshoujiejin, __cb) => {
				myData.jieshoujiejin = jieshoujiejin;
				getGongsijianjie(stock, __cb);
			},
			(gongsijianjie, __cb) => {
				myData.gongsijianjie = gongsijianjie;
				let url = "https://gw.yundzh.com/f10/cpbd/zxzb?obj=";
				let link = url + stock + '&token=' + token;
				getCengyongming(link, __cb);
			},
			(cengyongming, __cb) => {
				myData.gongsijianjie.cym = cengyongming;
				//console.log(JSON.stringify(myData, null, 4))
				let outputFilename = '../../f10/ziliao/' + stock + '.json';
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

function getClosePX(stock, cb) {

	stock = util.stockDZH2HS(stock);
	let url = 'http://onehou.com/api/hs/quote/v1/kline?get_type=offset&data_count=1&candle_period=6&candle_mode=0&prod_code=' + stock + '&fields=close_px%2C';
	util.getData(url, (err, data) => {

		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url,e);
				return cb(null, null);
			}
		}

		if (!data.data || !data.data.candle){
			console.log(url, data,'data exception');
			return cb(null, null);
		}
	
		let info = data.data.candle[stock];
		if (!info[0] || !info[0][1]) {
			console.log(url, data.data.candle, 'no data');
			return cb(null, null);
		}
		cb(null, info[0][1]);
	});
}

function getHeadlines(stock, close_px, report_date, cb) {
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/info/v2/query/f10_headlines?en_prod_code=' + stock;
	util.getData(url, (err, data) => {
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, {})
			}
		}
			
		if (!data.data || !data.data[0]){
			console.log(url, data,'data exception');
			return cb(null, {});
		}
		
		let date = _.keys(data.data[0])[0];
		let info = data.data[0][date][0][stock][0];
		if (!info) {
			console.log(url, data.data[0][date][0], 'no data');
			return cb(null, {});
		}
		cb(null, {
			pe: (close_px && report_date) ? (close_px/info.basic_eps/4*(Number(report_date.substring(4,6))/4+1)).toFixed(2) : util.isNull(Number(info.pe).toFixed(2)),    //市盈率
			pb: close_px ? (close_px/info.naps).toFixed(2) : info.pb, //市净率
			basic_eps: Number(info.basic_eps).toFixed(2),  //每股收益
			naps: Number(info.naps).toFixed(2), //每股净资产
			total_shares: util.isNumber(info.total_shares), //总股本
			oper_revenue_growrate: util.isNull(Number(info.oper_revenue_growrate).toFixed(2), '%'), //同比变化
			roe: util.isNull(Number(info.roe).toFixed(2), '%') //净资产收益率（摊薄）
		});
	});
}

function getIncomeStatement(stock, gross_profit_rate, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/info/v2/query/f10_income_statement?en_prod_code=' + stock + '&page_count=30';
	util.getData(url, (err, data) => {
			
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, {})
			}
		}
			
		if (!data.data || !data.data[0]){
			console.log(url, data,'data exception');
			return cb(null, {});
		}
		
		let date = _.keys(data.data[0])[0];
		let infos = data.data[0][date][0][stock]
		let info = infos[0];
		if (!info) {
			console.log(url, data.data[0][date][0], 'no data');
			return cb(null, {});
		}
		let last_date = (Number(info.report_date) - 10000).toString();
		let last_report = _.find(infos, {report_date: last_date, mark: "合并报告期调整"});
		let net_profit_growrate = null;
		if (last_report) {
			net_profit_growrate = util.isNull(((info.np_parent_company_owners - last_report.np_parent_company_owners)/last_report.np_parent_company_owners*100).toFixed(2), '%');
		} else {
			net_profit_growrate = '--';
		}
		cb(null, {
			report_date : info.report_date,
			gross_profit_rate : (gross_profit_rate == '--') ?  util.isNull((info.operating_profit/info.operating_revenue*100).toFixed(2),'%') : gross_profit_rate,
			net_profit : util.isNumber(info.np_parent_company_owners),    //净利润
			net_profit_growrate : net_profit_growrate,    // 净利润同比
			total_operating_revenue: info.total_operating_revenue ? util.isNumber(info.total_operating_revenue) : util.isNumber(info.operating_revenue), //营业总收入
			net_profit_per: util.isNull((info.np_parent_company_owners/info.operating_revenue*100).toFixed(2), '%')  //净利率
		});
	});
}

function getBalanceStatement(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/info/v2/query/f10_balance_statement?en_prod_code=' + stock;
	util.getData(url, (err, data) => {
			
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, {})
			}
		}
			
		if (!data.data || !data.data[0]){
			console.log(url, data,'data exception');
			return cb(null, {});
		}
		
		let date = _.keys(data.data[0])[0];
		let info = data.data[0][date][0][stock][0];
		if (!info) {
			console.log(url, data.data[0][date][0], 'no data');
			return cb(null, {});
		}
		cb(null, {
			liability_per: util.isNull((info.total_liability/info.total_assets*100).toFixed(2), '%') //负债率
		});
	});
}

function getMainBussiness(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/info/v2/query/f10_main_business_by_indurstry?en_prod_code=' + stock;
	util.getData(url, (err, data) => {
			
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, {})
			}
		}
			
		if (!data.data || !data.data[0]){
			console.log(url, data,'data exception');
			return cb(null, {});
		}
		
		let date = _.keys(data.data[0])[0];
		let infos = data.data[0][date][0][stock]
		let info = _.find(infos, {industry: '合计'});
		if (!info) {
			console.log(url, data.data[0][date][0], 'no data');
			return cb(null, {});
		} 
		cb(null, {
			gross_profit_rate: util.isNull(info.gross_profit_rate, '%') //毛利率
		});
	});
}

function getTrend(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/quote/v1/real?en_prod_code=' + stock + '&fields=market_value,circulation_amount,circulation_value';
	util.getData(url, (err, data) => {
			
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, [])
			}
		}
			
		if (!data.data || !data.data.snapshot){
			console.log(url, data,'data exception');
			return cb(null, {});
		}
		
		let info = data.data.snapshot[stock];
		cb(null, {
			market_value: util.isNumber(info[2]),
			circulation_amount: util.isNumber(info[3]),
			circulation_value: util.isNumber(info[4])
		});
	});
}

function getDashitixing(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/info/v2/query/ec_newest_multinfo?en_prod_code=' + stock;
	util.getData(url, (err, data) => {
			
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(url, e)
				return cb(null, [])
			}
		}
			
		if (!data.data || !data.data[0]){
			console.log(url, data,'data exception');
			return cb(null, []);
		}
		
		let list = [];
		let date = _.keys(data.data[0])[0];
		let infos = data.data[0][date][0][stock];
		if (infos.length > 3) {
			infos = infos.splice(0,3);
		}
		infos.forEach((item) => {
			let info = {};
			info.notice_date = item.notice_date;
			info.notice_type = item.notice_type;
			info.content = item.content;
			list.push(item);
		});
		cb(null, list);
	});
}

function getYingliyuce(url, cb) {
	
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
			
		if (!data.Data || !data.Data.RepDataF10RsrProForecastOutPut || !data.Data.RepDataF10RsrProForecastOutPut[0]){
			console.log(url, data,'data exception');
			return cb(null, []);
		}
		
		let list = [];
		let infos = data.Data.RepDataF10RsrProForecastOutPut[0].data;
		if (!infos || infos.length < 1) {
			console.log(infos, 'special data');
			return cb(null, []);
		}
		infos.forEach((item) => {
			let info = {};
			info.endate = item.enddate;
			info.mgsy = Number(item.mgsy).toFixed(2);
			info.syl = Number(item.syl).toFixed(2);
			list.push(info);
		});
		cb(null, list);
	});
}

function getTouzi(stock, token, cb) {

	let touzi = {};
	async.waterfall([
	(_cb) => {
		let url = "https://gw.yundzh.com/f10/zbyz/cyqtsszq?obj=";
		let link = url + stock + '&token=' + token;
		util.getData(link, (err, data) => {
			
			if (err) {
				return _cb(err);
			} else if (!data) {
				return _cb('no data');
			} else if (data.Err) {
				return _cb(data.Err);
			} else if (typeof data == 'string') {
				try {
					data = JSON.parse(data);
				} catch (e) {
					console.log(url, e)
					return _cb(null, {})
				}
			}
				
			if (!data.Data || !data.Data.RepDataF10ZbyzCyqtsszqOutPut || !data.Data.RepDataF10ZbyzCyqtsszqOutPut[0]){
				console.log(link, data,'data exception');
				return _cb(null, {});
			}
			
			let infos = data.Data.RepDataF10ZbyzCyqtsszqOutPut[0].data;
			if (!infos.length || infos.length < 1) {
				console.log(link, data,'data null');
				return _cb(null, {});
			}
			let info = infos[infos.length - 1];
			info.data = _.map(info.data, (ele) => {
				return {btzzqjc: ele.btzzqjc,
						zbl: ele.zbl,
						cstzje: ele.cstzje
				};
			});
			_cb(null, info);
		});
	},
	(shangshizhengquan, _cb) => {
		touzi.shangshizhengquan = shangshizhengquan;
		let url = "https://gw.yundzh.com/f10/zbyz/cyfssgq?obj=";
		let link = url + stock + '&token=' + token;
		util.getData(link, (err, data) => {
			
			if (err) {
				return _cb(err);
			} else if (!data) {
				return _cb('no data');
			} else if (data.Err) {
				return _cb(data.Err);
			} else if (typeof data == 'string') {
				try {
					data = JSON.parse(data);
				} catch (e) {
					console.log(url, e)
					return _cb(null, {})
				}
			}
				
			if (!data.Data || !data.Data.RepDataF10ZbyzCyfssgqOutPut || !data.Data.RepDataF10ZbyzCyfssgqOutPut[0]){
				console.log(stock, data,'data exception');
				return _cb(null, {});
			}
			
			let infos = data.Data.RepDataF10ZbyzCyfssgqOutPut[0].data;
			if (!infos.length || infos.length < 1) {
				console.log(link, data,'data null');
				return _cb(null, {});
			}

			let info = infos[infos.length - 1];
			info.data = _.map(info.data, (ele) => {
				return {scdxmc: ele.scdxmc,
						zbl: ele.zbl,
						cstzje: ele.cstzje
				};
			});
			_cb(null, info);
		});
	}
	],(err, feishangshizhengquan) => {
		if(err) return cb(err);
		touzi.feishangshizhengquan = feishangshizhengquan;
		cb(null, touzi);
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
			console.log(url, data,'data exception');
			return cb(null, []);
		}
		
		let infos = data.Data.RepDataF10zbyzRzqkzfyssOutPut[0].data;
		if (!infos || infos.length < 1) {
			console.log(infos, 'special data');
			return cb(null, []);
		}

		cb(null, _.map(infos, (item) => {
			return {
				sgr: item.sgr,
				rzlb: item.rzlb,
				fxjg: item.fxjg,
				rzje: item.zzfx * item.fxjg
			}
		}));
	});
}

function getJieshoujiejin(url, cb) {
	
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
			
		if (!data.Data || !data.Data.RepDataF10DstxJjltOutput || !data.Data.RepDataF10DstxJjltOutput[0]){
			console.log(url, data,'data exception');
			return cb(null, []);
		}
		
		let infos = data.Data.RepDataF10DstxJjltOutput[0].Data;
		if (!infos || infos.length < 1) {
			console.log(infos, 'special data');
			return cb(null, []);
		}

		cb(null, _.map(infos, (item) => {
			return {
				date: item.date,
				jjgf : util.isBigNumber(item.jjgf),
				zzgf : util.isNull(item.zzgf, '%'),
			}
		}));
	});
}

function getGongsijianjie(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://onehou.com/api/hs/info/v2/query/f10_company_profile?en_prod_code=' + stock;
	util.getData(url, (err, data) => {
			
		if (err) {
			return cb(err);
		} else if (!data) {
			return cb('no data');
		} else if (typeof data == 'string') {
			try {
				data = JSON.parse(data);
			} catch (e) {
				console.log(stock, e)
				return cb(null, {})
			}
		}
			
		if (!data.data || !data.data[0]){
			console.log(stock, data,'data exception');
			return cb(null, {});
		}
		
		let date = _.keys(data.data[0])[0];
		let info = data.data[0][date][0][stock][0];
		if (!info) {
			console.log(stock, data.data[0][date][0], 'no data');
			return cb(null, {});
		}
		cb(null, {
			chi_name: info.chi_name,
			state: info.state,
			indurstry: info.indurstry,
			list_date: info.list_date,
			issue_price: info.issue_price,
			legal_repr: info.legal_repr,
			tel: info.tel,
			website: info.website,
			main_business: info.main_business,
			major_business: info.major_business
		});
	});
}	



function getCengyongming(url, cb) {
	
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
			
		if (!data.Data || !data.Data.RepDataF10CpbdZxzbOutput || !data.Data.RepDataF10CpbdZxzbOutput[0]){
			console.log(url, data,'data exception');
			return cb(null, {});
		}
		
		let name = data.Data.RepDataF10CpbdZxzbOutput[0].cym;
		cb(null, name);
	});
}