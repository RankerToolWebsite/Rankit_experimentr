library(ggplot2)
library(ggfortify)
library(cluster)
library(lfda)
library(coin)
library(pwr)
library(shiny)
library(miniUI)
library(boot)
library(tidyr)
library(irr)
library(lazyeval)
library(doBy)
library(gtable)
library(grid)
library(scales)
library(plyr)
library(dplyr)
library(bootES)
library(extrafont)

loadfonts()

# Reporting
report <- function(data, attr) {
  cat("N=",   round( length( data[[attr]] ), 1), ",", 
      "M=",   round( mean( data[[attr]] )  , 1), ",", 
      "sd=",  round( sd( data[[attr]] )    , 1), ",", 
      "Mdn=", round( median( data[[attr]] ), 1), ",", 
      "mad=", round( mad( data[[attr]] )   , 1), 
  sep="")
}

reportCI <- function(data, attr) {
  # bootstrapping with 1000 replications
  ci <- boot.ci(
    boot(data=data[[attr]], statistic=mean.fun, R=1000, sim="ordinary")
  )
  
  cat( "M=",     round( mean( data[[attr]] ), 1), "~", 
       "[", round( ci$bca[,4]          , 1), ",", 
       round( ci$bca[,5]          , 1), "]", 
       sep="")
}

reportES <- function(data, attr, group) {
  
  # lvs <- levels(data[[group]])
  # print(lvs[1])
  if(group=="search_factor"){
  b <- bootES(data, 
              data.col=attr, 
              group.col=group, 
              contrast=c("search"=1,"non-search"=-1), 
              effect.type="cohens.d"
  )
  
  cat( "d=",     round( b$t0, 2), "~", 
       "[", round( b$bounds[1], 2), ",", 
       round( b$bounds[2], 2), "]", 
       sep="")
  } else if(group=="condition"){
    b <- bootES(data, 
                data.col=attr, 
                group.col=group, 
                contrast=c("hololens"=1,"control"=-1), 
                effect.type="cohens.d"
    )
    
    cat( "d=",     round( b$t0, 2), "~", 
         "[", round( b$bounds[1], 2), ",", 
         round( b$bounds[2], 2), "]", 
         sep="")
  } else if(group == "search_state") {
    b <- bootES(data, 
                data.col=attr, 
                group.col=group, 
                contrast=c("using_box"=1,"not_using_box"=-1), 
                effect.type="cohens.d"
    )
    
    cat( "d=",     round( b$t0, 2), "~", 
         "[", round( b$bounds[1], 2), ",", 
         round( b$bounds[2], 2), "]", 
         sep="")
  }
}


reportES_within <- function(data, attr, group="search_state") {
  
  # lvs <- levels(data[[group]])
  # print(lvs[1])
  
  
}

# Filtering

madfilter <- function(data, attr, fac) {
  mad <- mad( data[[attr]] )
  median <- median( data[[attr]] )
  data <-
    data[ data[[attr]] < median + fac*mad &
            data[[attr]] > median - fac*mad, ]
}

rangefilter <- function(data, attr, lo, hi) {
  data <-
    data[ data[[attr]] < hi &
            data[[attr]] > lo, ]
}

# Bootstrap 95% CI for mean
# function to obtain mean from the data (with indexing)
mean.fun <- function(D, d) {
  return( mean(D[d]) )
}

########################## count bar ##########################
countBar <- function(data,x,group, xRange=NULL){
  data['x_'] <- data[x]
  data['group_'] <- data[group]
  
  p <- ggplot(data, aes(x_, fill = group_))
  p <- p + geom_histogram(binwidth=1, alpha=1, position="dodge",stat="count")
  p <- p + coord_cartesian(xlim = xRange) 
  p <- p + labs(y="Count",
                x=x,
                fill=group,
                title=paste("Proportional Distribution: ",x," ~ ",group))
  print(p)
}

countBarMulti <- function(data,xCol, group, xRange=NULL){
  for(x in xCol){
    countBar(data,x,group, xRange)
  }  
}

########################## scatter plot ##########################
scatterPlot <- function(data,y,x,alpha=0.3){
  data['y_'] <- data[y]
  data['x_'] <- data[x]
  
  p <- ggplot(data, aes(y_, x=x_, color = x_))
  p <- p + geom_point(shape=1, alpha=alpha)
  p <- p + labs(y=y,
                x=x,
                color=x,
                title=paste("Scatter Plot: ",y," ~ ",x))
  print(p)
}

scatterPlotMulti <- function(data,yCol, x, alpha=0.3){
  for(y in yCol){
    scatterPlot(data,y,x, alpha)
  }  
}

########################## density ##########################
densityPlot <- function(data,x,group,xRange=NULL){
  data['x_'] <- data[x]
  data['group_'] <- data[group]
  
  p <- ggplot(data, aes(x_, fill = group_))
  p <- p + geom_density( alpha=0.5 )
  p <- p + coord_cartesian(xlim=xRange)
  p <- p + labs(y="Density",
                x=x,
                fill=group,
                title=paste("Density: ",x," ~ ",group))
  print(p)
}

densityPlotMulti <- function(data,xCol, group=NULL){
  for(x in xCol){
    densityPlot(data,x,group)
  }  
}

########################## proportional bar chart ##########################
proportionalBar <- function(data,x, group){
  charX <- x
  charGroup <- group
  data['x_'] <- data[charX]
  data['group_'] <- data[charGroup]
  
  data.new<-ddply(data,.(group_),plyr::summarise,
                  proportion=as.numeric(prop.table(table(x_))),
                  category=names(table(x_)))
  
  p <- ggplot(data.new,aes(x=category,y=proportion,fill=group_))
  p <- p + geom_bar(stat="identity",position='dodge')
  p <- p + geom_text(aes(label = sprintf("%1.2f%%", 100*proportion)),position = position_dodge(0.9),vjust=-0.25)
  p <- p + labs(y="Proportion",
                x=charX,
                fill=charGroup,
                title=paste("Proportional Distribution: ",charX," ~ ",charGroup))
  print(p)
}

proportionalBarMulti <- function(data,xCol, group){
  for(x in xCol){
    proportionalBar(data,x,group)
  }
}

########################## proportional test ##########################
proportionalTest <- function(data, x, compareValue, group){
  data['compareVar_'] <- ifelse(data[x] == compareValue ,0,1)
  data['group_'] <- data[group]
  
  tbl <- table(data$group_,data$compareVar_)
  print(tbl)
  test <- prop.test(tbl,correct=TRUE)
  print(test)
  lower <- test$conf.int[1]
  upper <- test$conf.int[2]
  print(paste("Diff=",test$estimate[1]-test$estimate[2]))
}

########################## proportional test CI bar ##########################
proportionalTestCIBar <- function(data, x, compareValue, group, xRange=0, yRange=0){
  
  data['compareVar_'] <- ifelse(data[x] == compareValue ,1,0)
  data['group_'] <- data[group]
  
  df<-ddply(data,.(group_),plyr::summarise,
                prop=sum(compareVar_)/length(compareVar_),
                low=prop.test(sum(compareVar_),length(compareVar_))$conf.int[1],
                upper=prop.test(sum(compareVar_),length(compareVar_))$conf.int[2])
  
  #basic
  p <- ggplot(df,aes(group_,y=prop,ymin=low,ymax=upper,fill=group_))
  p <- p + geom_bar(stat="identity",width=.5)
  p <- p +  geom_errorbar(width = 0.1)
  p <- p + geom_text(aes(label = sprintf("%1.2f%%", 100*prop)),position = position_dodge(0.9),vjust=-0.25)
  p <- p + labs(y="Proportion",
                x=x,
                fill=group,
                title=paste("Proportions of ",compareValue," in ",x,"with CI: ", " ~ ",group))
  p
}

proportionalTestCIFancy <- function(data, x, compareValue, group, xRange=0, yRange=0,savePath="test.pdf"){
  
  data['compareVar_'] <- ifelse(data[x] == compareValue ,1,0)
  data['group_'] <- data[group]
  
  df<-ddply(data,.(group_),plyr::summarise,
            prop=sum(compareVar_)/length(compareVar_),
            lower=prop.test(sum(compareVar_),length(compareVar_))$conf.int[1],
            upper=prop.test(sum(compareVar_),length(compareVar_))$conf.int[2])
  
  p <- ggplot(df, aes(group_, y=prop,ymin=low,ymax=upper, colour = group_))
  p <- p + scale_color_manual(values=c("#998EC3","#fa9fb5"))
  p <- p + theme(axis.title=element_text(size=20), axis.text=element_text(size=18))
  p <- p + geom_pointrange(aes(ymin = lower, ymax = upper)) 
  p <- p + expand_limits(y = yRange) 
  p <- p + ylab("Percentage") 
  p <- p + xlab("") 
  p <- p + geom_errorbar(aes(ymin = lower, ymax = upper), width = 0.1) 
  p <- p + coord_flip() 
  p <- p + theme_bw() 
  p <- p + theme(plot.title=element_text(hjust=0))
  p <- p + theme(panel.border=element_blank())
  p <- p + theme(panel.grid.minor=element_blank())
  p <- p + theme(axis.ticks=element_blank())
  p <- p + theme(legend.key=element_rect(color="white"))
  #p <- p + theme(text=element_text(family="Garamond"))
  p <- p + theme(axis.text.y = element_blank())
  p <- p + scale_y_continuous(labels=percent)
  p <- p + guides(colour=FALSE)
  p
  
  ggsave(savePath, p, width=2.75, height=0.75)
}

########################## CI plot ##########################
ciplot <- function(data, y, x, label, yRange=0, xRange=0, colors=c("#66c2a5","#fc8d62","#8da0cb")) {
#ciplot <- function(data, y, x, yRange=0, xRange=0, colors=c("#1b9e77","#d95f02","#7570b3")) {
  
  data['x_'] <- data[x]
  data['y_'] <- data[y]
  
  data[['x_']] <- factor(data[['x_']])
  
  groups <- group_by_(data, 'x_')
  
  # So far the only way to enable string as param
  groupedData <- dplyr::summarize(groups, 
                                  mean=mean(y_),
                                  UCI= boot.ci(boot(y_, statistic = mean.fun, R=1000, sim="ordinary"))$bca[,5],
                                  LCI= boot.ci(boot(y_, statistic = mean.fun, R=1000, sim="ordinary"))$bca[,4])
  
  
  df <- data.frame(
    trt = factor(groupedData[[1]]),
    resp = groupedData[["mean"]],
    group = factor(groupedData[[1]]),
    upper = c(groupedData[["UCI"]]),
    lower = c(groupedData[["LCI"]])
  )
  print(df)
  
  # Plot
  p <- ggplot(df, aes(trt, resp, colour = group, shape=group))
  p <- p + scale_color_manual(values=colors)
  p <- p + theme(axis.title=element_text(size=18), axis.text=element_text(size=18))
  p <- p + geom_pointrange(aes(ymin = lower, ymax = upper), size = 2) 
  p <- p + ylab(label) 
  p <- p + xlab(NULL) 
  p <- p + geom_errorbar(aes(ymin = lower, ymax = upper), width = 0.1) 
  p <- p + coord_flip() 
  p <- p + theme_bw() 
  p <- p + theme(plot.title=element_text(hjust=0))
  p <- p + theme(panel.grid.minor=element_blank())
  p <- p + theme(axis.ticks=element_blank())
  #p <- p + theme(legend.key=element_rect(color="white"))
  p <- p + theme(legend.position="none")
  p <- p + theme(text = element_text(size=25))
  p <- p + theme(plot.margin=grid::unit(c(0,0,0,0), "mm"))
  p
}

ciplotFancy <- function(data, y, x, yRange=0, xRange=0,colors=c("#998EC3","#F1A340"),savePath="") {
  
  data['x_'] <- data[x]
  data['y_'] <- data[y]
  
  data[['x_']] <- factor(data[['x_']])
  
  groups <- group_by_(data, 'x_')
  
  # So far the only way to enable string as param
  groupedData <- dplyr::summarize(groups, 
                                  mean=mean(y_),
                                  UCI= boot.ci(boot(y_, statistic = mean.fun, R=1000, sim="ordinary"))$bca[,5],
                                  LCI= boot.ci(boot(y_, statistic = mean.fun, R=1000, sim="ordinary"))$bca[,4])
  
  
  df <- data.frame(
    trt = factor(groupedData[[1]]),
    resp = groupedData[["mean"]],
    group = factor(groupedData[[1]]),
    upper = c(groupedData[["UCI"]]),
    lower = c(groupedData[["LCI"]])
  )
  
  #ci bar colors
  if(x == "search_factor")
    colors = c("#998EC3","#F26A4D")
  else if(x == "condition")
    colors = c("#998EC3","#F1A340")
  else if(x== "search_state")
    colors = c("#F1A340","#F1A340")
    #colors = c("#74c476","#74c476")
  
  
  
  p <- ggplot(df, aes(trt, resp, colour = group))
  p <- p + scale_color_manual(values=colors)
  p <- p + theme(axis.title=element_text(size=20), axis.text=element_text(size=18))
  p <- p + geom_pointrange(aes(ymin = lower, ymax = upper)) 
  p <- p + expand_limits(y = yRange) 
  p <- p + scale_y_continuous(breaks = seq(yRange[1],yRange[2], length.out = 5))
  p <- p + ylab(y) 
  p <- p + xlab("") 
  p <- p + geom_errorbar(aes(ymin = lower, ymax = upper), width = 0.1) 
  p <- p + coord_flip() 
  p <- p + theme_bw() 
  p <- p + theme(plot.title=element_text(hjust=0))
  p <- p + theme(panel.border=element_blank())
  p <- p + theme(panel.grid.minor=element_blank())
  p <- p + theme(axis.ticks=element_blank())
  #p <- p + theme(legend.key=element_rect(color="white"))
  #p <- p + theme(text=element_text(family="Avenir Next Medium"))
  p <- p + theme(axis.text.y = element_blank())
  p <- p + guides(colour=FALSE)
  p
  if(savePath != ""){
  ggsave(savePath, p, width=2.75, height=0.75)
  } else {

  }
}

ciplotMulti <- function(data, yCol, x, yRange=0, xRange=0) {
  for(y in yCol){
    ciplot(data,y,x,yRange,xRange)
  }
}

ciplotManualMulti <- function(data, yCol, x, yRange=0, xRange=0) {
  for(y in yCol){
    ciplotManual(data,y,x,yRange,xRange)
  }
}

ciplotManual <- function(data, y, x, yRange=0, xRange=0) {
  
  data['x_'] <- data[x]
  data['y_'] <- data[y]
  
  data[['x_']] <- factor(data[['x_']])
  
  groups <- group_by_(data, 'x_')
  
  # So far the only way to enable string as param
  groupedData <- dplyr::summarize(groups, 
                                  mean=mean(y_)
                                  #UCI=boot.ci(boot(y_, statistic = mean.fun, R=1000, sim="ordinary"))$bca[,5],
                                  #LCI=boot.ci(boot(y_, statistic = mean.fun, R=1000, sim="ordinary"))$bca[,4]
                                  )
  
  
  # df <- data.frame(
  #   trt = factor(groupedData[[1]]),
  #   resp = groupedData[["mean"]],
  #   group = factor(groupedData[[1]]),
  #   upper = c(groupedData[["UCI"]]),
  #   lower = c(groupedData[["LCI"]])
  # )
  
  # Fixed CI calculation?
  df2 <- groups %>%
    #group_by(data[[x_]]) %>%
    summarize(n=n(),resp=mean(y_),sd=sd(y_)) %>%
    mutate(se=sd/sqrt(n),lower=resp+qnorm(0.025)*se,upper=resp+qnorm(0.975)*se)
  df2['trt'] <- factor(groupedData[[1]])
  
  # Plot
  p <- ggplot(df2, aes(trt, resp,color=trt))
  p <- p + scale_color_manual(values=c("#998EC3","#F1A340"))
  p <- p + theme(axis.title=element_text(size=20), axis.text=element_text(size=18))
  p <- p + geom_pointrange(aes(ymin = lower, ymax = upper)) 
  p <- p + expand_limits(y = yRange, x = xRange) 
  p <- p + geom_errorbar(aes(ymin = lower, ymax = upper), width = 0.1) 
  p <- p + labs(y=y,
                x=x,
                title=paste("CI Plot: ",y, " ~ ", x))
  #p <- p + geom_hline(yintercept = 0)
  #p <- p + coord_flip() 
  print(p)
}
## Gives count, mean, standard deviation, standard error of the mean, and confidence interval (default 95%).
##   data: a data frame.
##   measurevar: the name of a column that contains the variable to be summariezed
##   groupvars: a vector containing names of columns that contain grouping variables
##   na.rm: a boolean that indicates whether to ignore NA's
##   conf.interval: the percent range of the confidence interval (default is 95%)
summarySE <- function(data=NULL, measurevar, groupvars=NULL, na.rm=FALSE,
                      conf.interval=.95, .drop=TRUE) {
  library(plyr)
  
  # New version of length which can handle NA's: if na.rm==T, don't count them
  length2 <- function (x, na.rm=FALSE) {
    if (na.rm) sum(!is.na(x))
    else       length(x)
  }
  
  # This does the summary. For each group's data frame, return a vector with
  # N, mean, and sd
  datac <- ddply(data, groupvars, .drop=.drop,
                 .fun = function(xx, col) {
                   c(N    = length2(xx[[col]], na.rm=na.rm),
                     mean = mean   (xx[[col]], na.rm=na.rm),
                     sd   = sd     (xx[[col]], na.rm=na.rm)
                   )
                 },
                 measurevar
  )
  
  # Rename the "mean" column    
  datac <- rename(datac, c("mean" = measurevar))
  
  datac$se <- datac$sd / sqrt(datac$N)  # Calculate standard error of the mean
  
  # Confidence interval multiplier for standard error
  # Calculate t-statistic for confidence interval: 
  # e.g., if conf.interval is .95, use .975 (above/below), and use df=N-1
  ciMult <- qt(conf.interval/2 + .5, datac$N-1)
  datac$ci <- datac$se * ciMult
  
  return(datac)
}

#with error
ciBar <- function(data, measure, group){
  data <- summarySE(data, measurevar=measure, groupvars=group,
                    na.rm=FALSE, conf.interval=.95)
  xAxis = as.symbol(group)
  yAxis = as.symbol(measure)
  print(xAxis)
  print(yAxis)
  ggplot(data, aes(x=xAxis, y=yAxis)) + 
    geom_bar(position=position_dodge(), stat="identity") +
    geom_errorbar(aes(ymin=error_log-ci, ymax=error_log+ci),
                  width=.2,                    # Width of the error bars
                  position=position_dodge(.9))
}

fullReport <- function(data, y, group, yRange=0, paired=FALSE,savePath = "img\test.pdf"){
  
  data['group_'] <- data[group]
  data['y_'] <- data[y]
  
  # two levels
    lv <- c('hololens', 'control')
  print(lv)
  
  report(data %>% filter(group_==lv[1]), y)
  reportCI(data %>% filter(group_==lv[1]),y)
  report(data %>% filter(group_==lv[2]),y)
  reportCI(data %>% filter(group_==lv[2]),y)
  
  tt <- t.test(y_ ~ group_, data)
  print(tt)
  wt <- wilcox.test(y_ ~ group_, data, conf.int=TRUE,paired=paired)
  print(wt)
  
  reportES(data, y, group) 
  
  savePath = paste("img/", y,".pdf",sep="")

  # fancy ci plots
  ciplotFancy(data, y,group,yRange,savePath=savePath)
}


powerAnalysisGraph <- function(m1, m2, stdev, iterNum=15){
  
  iteration <- 15
  
  difference <- 0
  effectSize <- 0
  numParticipants <- 0
  
  for(step in 1:iteration)
  {
    difference[step] <- abs(m1 - m2) * (0.9 ^ (step-1))
    effectSize[step] <- difference[step] / stdev
    numParticipants[step] <- pwr.t.test( 
      d=effectSize[step], 
      sig.level=.05, 
      power=0.8, 
      type="two.sample" 
    )$n * 1.15 * 2
  }
  

  grid.newpage()
  
  pw <- data.frame(difference=difference, numParticipants=numParticipants, effectSize=effectSize)
  print(pw)
  
  p1 <- ggplot(pw,aes(x=difference)) + geom_line(aes(y = numParticipants)) +
    scale_y_continuous(breaks = pretty(pw$numParticipants, n = 10))
  p2<- ggplot(pw,aes(x=difference)) + geom_line(aes(y = effectSize)) +
    theme(panel.background = element_rect(fill = NA))+
    scale_y_continuous(breaks = pretty(pw$effectSize, n = 10))
  p2
  
  # extract gtable
  g1 <- ggplot_gtable(ggplot_build(p1))
  g2 <- ggplot_gtable(ggplot_build(p2))
  
  # overlap the panel of 2nd plot on that of 1st plot
  pp <- c(subset(g1$layout, name == "panel", se = t:r))
  g <- gtable_add_grob(g1, g2$grobs[[which(g2$layout$name == "panel")]], pp$t, pp$l, pp$b, pp$l)
  
  # axis tweaks
  ia <- which(g2$layout$name == "axis-l")
  ga <- g2$grobs[[ia]]
  ax <- ga$children[[2]]
  ax$widths <- rev(ax$widths)
  ax$grobs <- rev(ax$grobs)
  ax$grobs[[1]]$x <- ax$grobs[[1]]$x - unit(1, "npc") + unit(0.15, "cm")
  g <- gtable_add_cols(g, g2$widths[g2$layout[ia, ]$l], length(g$widths) - 1)
  g <- gtable_add_grob(g, ax, pp$t, length(g$widths) - 1, pp$b)
  
  # draw it
  grid.draw(g)
}
