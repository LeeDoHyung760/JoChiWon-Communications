import {model,Schema} from 'mongoose';

const memberSchema=new Schema({userId:{type:String,required:true},name:{type:String,required:true},joinedAt:{type:String,required:true}},{_id:false});
const clubSchema=new Schema({
  id:{type:String,required:true,unique:true,index:true},name:{type:String,required:true,trim:true},description:{type:String,default:''},category:{type:String,default:'기타'},color:{type:String,default:'#6c5ce7'},ownerId:{type:String,required:true},ownerName:{type:String,required:true},members:{type:[memberSchema],default:[]},activity:{type:String,default:''},location:{type:String,default:'세종 공동캠퍼스'},schedule:{type:String,default:'일정 협의'},capacity:{type:Number,default:12,min:2,max:100},tags:{type:[String],default:[]},activityBoard:{type:Schema.Types.Mixed},createdAt:{type:String,required:true},
},{versionKey:false});

export const ClubModel=model('Club',clubSchema);
