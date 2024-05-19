---
title: 45. Tests in C
---

## commit log

```plaintext
Rewrite tests in shell script in C
```

我们的测例越来约多了，都写在一个test.sh里面实在是显得太繁杂，我们这一次commit，来将其整理一下。

但是这一次commit修改的内容就过多了，我们只挑重点的讲。

## 思路

我们首先设计一个宏ASSERT，第一个参数是结果，第二个参数是代码，类似这样：

```c
ASSERT(0, ({int x = 0; return x; }))
```

这个宏会进行一个拓展，调用assert函数：

```c
#define ASSERT(x, y) assert(x, y, #y)
```

不过我们的chibicc还不支持宏，因此这一步需要gcc的帮助。

注意这里的`#y`，它指示将其变成一个字符串，例如：

```c
ASSERT(0, ({int x = 0; return x; }))
// 拓展成
assert(0, ({int x = 0; return x; }), "({int x = 0; return x; })");
```

assert函数的定义，需要利用printf函数：

```c
#include <stdio.h>
#include <stdlib.h>

void assert(int expected, int actual, char *code) {
  if (expected == actual) {
    printf("%s => %d\n", code, actual);
  } else {
    printf("%s => %d expected but got %d\n", code, expected, actual);
    exit(1);
  }
}
```

这一行是在main函数里面的：

```c
int main() {
  ASSERT(0, ({int x = 0; return x; }));
  printf("OK\n");
}
```

然后我们使用chibicc去编译这段代码，会变成，这样`({})`里面的代码就是我们要检测的内容了。然后我们把chibicc翻译来的汇编语言利用gcc再进行编译即可。因为我们的chibicc还没有实现printf函数，当然assert函数也不能直接用。

说清楚了这个，我们就可以来看Makefile了：

```Makefile
CFLAGS=-std=c11 -g -fno-common

SRCS=$(wildcard *.c)
OBJS=$(SRCS:.c=.o)

TEST_SRCS=$(wildcard test/*.c)
TESTS=$(TEST_SRCS:.c=.exe)

chibicc: $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

$(OBJS): chibicc.h

test/%.exe: chibicc test/%.c
	$(CC) -o- -E -P -C test/$*.c | ./chibicc -o test/$*.s -
	$(CC) -o $@ test/$*.s -xc test/common

test: $(TESTS)
	for i in $^; do echo $$i; ./$$i || exit 1; echo; done
	test/driver.sh

clean:
	rm -rf chibicc tmp* $(TESTS) test/*.s test/*.exe
	find * -type f '(' -name '*~' -o -name '*.o' ')' -exec rm {} ';'

.PHONY: test clean

```

第14行，就是利用`gcc -E -P -C`进行一个宏展开（不加`-C`也可以），将宏展开的代码传入到`chibicc`中进行编译，然后再将编译来的`.s`文件与`test/common`（存放`assert`函数）文件做一个汇编与链接，生成一个`.exe`文件（当然，这个东西应该不能真的在windows下面使用）。

‍
