import { Text, View, StyleSheet } from 'react-native'; import { colors } from '../shared/theme';
export function AppHeader({title,subtitle}:{title:string;subtitle?:string}){return <View style={s.wrap}><Text style={s.title}>{title}</Text>{subtitle?<Text style={s.subtitle}>{subtitle}</Text>:null}</View>}
const s=StyleSheet.create({wrap:{marginBottom:18},title:{fontSize:28,fontWeight:'900',color:colors.text},subtitle:{fontSize:13,color:colors.muted,marginTop:4}});
