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
				getHeadlines(stock, __cb);
			},
			(headline, __cb) => {
				myData.zhuyaozhibiao = headline;
				getIncomeStatement(stock, __cb);
			},
			(incomeStatement, __cb) => {
				_.assign(myData.zhuyaozhibiao, incomeStatement);
				getBalanceStatement(stock, __cb);
			},
			(balanceStatement, __cb) => {
				_.assign(myData.zhuyaozhibiao, balanceStatement);
				getCashflowStatement(stock, __cb);
			},
			(cashflowStatement, __cb) => {
				_.assign(myData.zhuyaozhibiao, cashflowStatement);
				getMainBussiness(stock, __cb);
			},
			(mainBussiness, __cb) => {
				_.assign(myData.zhuyaozhibiao, mainBussiness);
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
				getTouzi(stock, token, __cb);
			},
			(touzi, __cb) => {
				myData.touzi = touzi;
				let url = "https://gw.yundzh.com/f10/zbyz/rzqkzfyss?obj=";
				let link = url + stock + '&token=' + token;
				getRongzi(link, __cb);
			},
			(rongzi, __cb) => {
				myData.rongzi = rongzi;
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


function getHeadlines(stock, cb) {
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://www.onehou.com/api/hs/info/v2/query/f10_headlines?en_prod_code=' + stock;
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
			pe: info.pe,
			pb: info.pb,
			basic_eps: info.basic_eps,
			naps: info.naps,
			total_shares: info.total_shares,
			oper_revenue_growrate: info.oper_revenue_growrate,
			net_profit_growrate: info.net_profit_growrate,
			roe: info.roe
		});
	});
}

function getIncomeStatement(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://www.onehou.com/api/hs/info/v2/query/f10_income_statement?en_prod_code=' + stock;
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
			total_operating_revenue: info.total_operating_revenue,
			net_profit_per: info.net_profit/info.operating_revenue*100
		});
	});
}

function getBalanceStatement(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://www.onehou.com/api/hs/info/v2/query/f10_balance_statement?en_prod_code=' + stock;
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
			liability_per: info.total_liability/info.total_assets
		});
	});
}

function getCashflowStatement(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://www.onehou.com/api/hs/info/v2/query/f10_cashflow_statement?en_prod_code=' + stock;
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
			net_profit: info.net_profit
		});
	});
}

function getMainBussiness(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://www.onehou.com/api/hs/info/v2/query/f10_main_business_by_indurstry?en_prod_code=' + stock;
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
			gross_profit_rate: info.gross_profit_rate
		});
	});
}

function getTrend(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://www.onehou.com/api/hs/quote/v1/real?en_prod_code=' + stock + '&fields=market_value,circulation_amount,circulation_value';
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
			market_value: info[2],
			circulation_amount: info[3],
			circulation_value: info[4]
		});
	});
}

function getDashitixing(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://www.onehou.com/api/hs/info/v2/query/ec_newest_multinfo?en_prod_code=' + stock;
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
			info.mgsy = item.mgsy;
			info.syl = item.syl;
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
				jjgf: item.jjgf,
				zzgf: item.zzgf
			}
		}));
	});
}

function getGongsijianjie(stock, cb) {
	
	stock = util.stockDZH2HS(stock);
	if (!stock) {
		return cb('stock code error');
	}
	let url = 'http://www.onehou.com/api/hs/info/v2/query/f10_company_profile?en_prod_code=' + stock;
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