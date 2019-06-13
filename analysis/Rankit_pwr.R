source("analysis.R") # for ciplot()
library(ggplot2)
library(grid)
library(gtable)
library(dplyr)
library(pwr) # for power analysis
library(tidyverse)
library(readxl)
library(forcats)

options(warn=-1)


######### QUESTIONS ########
q1 <- read.csv("results/question1.csv")
q2 <- read.csv("results/question2.csv")
q3 <- read.csv("results/question3.csv")
q4 <- read.csv("results/question4.csv")
q5 <- read.csv("results/question5.csv")


q1
q1$`Elicitation Method`  <- q1$Component

q1%>% 
  ggplot( aes(x=condition, y = measure, colour=condition)) +
  #  geom_point(alpha=0.2) +
  stat_summary(fun.data = "mean_cl_boot", size = 1) +
  ylim(c(-2, 2)) + 
  #  ylab('-2 "Not at all challenging" | 2 "Extremely Challenging"') +
  ylab('') +
  labs(
    title='How challenging was it to understand that more movies\ncould be revealed by scrolling?',
    subtitle='-2 "Not at all challenging" | 2 "Extremely Challenging"'
  ) + theme_bw()
```

######### ADDS ########
adds <- read.csv("results/adds.csv")
mean(subset(adds, condition == 'Category')$measure)
p = ciplot(adds, "measure", "condition", "Number of Items Added")
p
ggsave(plot = p, width = 10, height = 2, dpi = 300, filename = "charts/adds.pdf")


######### RemoveS ########
removes <- read.csv("results/removes.csv")
mean(subset(removes, condition == 'Category')$measure)
p = ciplot(removes, "measure", "condition", "Number of Items Removed")
p
ggsave(plot = p, width = 10, height = 2, dpi = 300, filename = "charts/removes.pdf")

######### swap ########
swaps <- read.csv("results/swaps.csv")
p = ciplot(swaps, "measure", "condition", "Number of Items Swapped")
p
ggsave(plot = p, width = 10, height = 2, dpi = 300, filename = "charts/swaps.pdf")

addsn <- read.csv("results/adds_noswap.csv")
mean(subset(addsn, condition == 'Category')$measure)
p = ciplot(addsn, "measure", "condition", "Number of Items Added (Not Counting Swaps)")
p
ggsave(plot = p, width = 10, height = 2, dpi = 300, filename = "charts/adds_noswaps.pdf")

removesn <- read.csv("results/removes_noswap.csv")
mean(subset(removesn, condition == 'Category')$measure)
p = ciplot(removesn, "measure", "condition", "Number of Items Removed (Not Counting Swaps)")
p
ggsave(plot = p, width = 10, height = 2, dpi = 300, filename = "charts/removes_noswaps.pdf")


######### Iterations ########
ranks <- read.csv("results/ranks.csv")
p = ciplot(ranks, "measure", "condition", "Number of Times Iterating between Rank and Explore")
p
ggsave(plot = p, width = 10, height = 2, dpi = 300, filename = "charts/iterations.pdf")


######### build ########
build <- read.csv("results/build.csv")
p = ciplot(build, "measure", "condition", "Minutes Spent Building")
p
ggsave(plot = p, width = 10, height = 2, dpi = 300, filename = "charts/build.pdf")

######### explore ########
explore <- read.csv("results/explore.csv")
p = ciplot(explore, "measure", "condition", "Minutes Spent Exploring")
p
ggsave(plot = p, width = 10, height = 2, dpi = 300, filename = "charts/explore.pdf")

############ Power Analysis ADDS ###############
# Assign groups: experimental & control
#group_list <- subset(adds, condition== "List")
group_cat <- subset(adds, condition=="Category")
group_pairs <- subset(adds, condition=="Pairwise")

# calculate stats

mean_c <- mean(group_cat$measure)

#mean_l <- mean(group_list$measure)
#list_cat = subset(adds, is.element(adds$condition, c("Category", "List")))
#SD<-sd(list_cat$measure) 

mean_p <- mean(group_pairs$measure) 
pair_cat = subset(adds, is.element(adds$condition, c("Category", "Pairwise")))
SD<-sd(pair_cat$measure)

# overall standard deviation

iteration <- 15

true_difference <- numeric(iteration)
effect_size <- numeric(iteration)
sample_size <- numeric(iteration)

# Calculate the sample size(s) by tweaking the estimation of true difference
for(step in 1:iteration)
{
  # "Guess" the true difference from the difference in the sample adds, 
  # and then set it to be smaller and smaller (as 'step' goes up).
  
  ######################
  #true_difference[step] <- abs(mean_l - mean_c) * (0.9 ^ (step-1))
  true_difference[step] <- abs(mean_p - mean_c) * (0.9 ^ (step-1))
  
  # Calculate the effect size given the true difference and SD from sample adds
  effect_size[step] <- true_difference[step] / SD
  # Calculate the sample size
  sample_size[step] <- pwr.t.test( 
    d=effect_size[step], 
    sig.level=.05, # Our desired Type I error = 0.05
    power=0.8, # Our desired Type II error = 0.2 (power=1-0.2 = 0.8)
    type="two.sample",
    alternative="two.sided" # Default
  )$n * 1.15 * 2 # x2 for two groups, and x1.15 for a slightly larger estimation
}

pw <- adds.frame(true_difference, sample_size, effect_size)

p1 <- ggplot(pw,aes(x=true_difference)) + geom_line(aes(y = sample_size)) +
  scale_y_continuous(breaks = pretty(pw$sample_size, n = 10))
p1

p2<- ggplot(pw,aes(x=true_difference)) + geom_line(aes(y = effect_size)) +
  # theme(panel.background = element_rect(fill = NA))+
  scale_y_continuous(breaks = pretty(pw$effect_size, n = 10))
p2

######### (Optional) Put the two diagrams together for easier thresholding ##########
grid.newpage()

p2 <- p2 + theme(panel.background = element_rect(fill = NA))

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
```
