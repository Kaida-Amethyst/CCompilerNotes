---
title: 8. Code Modularization
---

## Commit log

```plaintext
Split main.c into multiple small files
```

我们现在的`main.c`包含了三个部分，已经有一点大了，所以这一个commit把个main.c分成三个部分。用一个统一的`chibicc.h`的头文件来管理，把lexer的部分分到`tokenize.c`，把parser的部分分到`parse.c`，把CodeGen的部分分到`codegen.c`。

## Makefile

这里特别地要点出Makefile的写法：

```makefile
CFLAGS=-std=c11 -g -fno-common
SRCS=$(wildcard *.c)
OBJS=$(SRCS:.c=.o)

chibicc: $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

$(OBJS): chibicc.h

test: chibicc
	./test.sh

clean:
	rm -f chibicc *.o *~ tmp*

.PHONY: test clean
```

第二行的wildcard指示后面的`*.c`中有通配符。

第三行的`$(SRCS:.c=.o)`，意思是把SRCS中变量展开后，变量名带`.c`的要替换成`.o`。

第六行`$@`用来代指目标，这里就是chibicc。`$^`用来代指前提条件，这里就是一堆objs。

注意第五六两行的命令会不止执行一次，因为有多个目标文件。
